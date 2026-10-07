// Utilitários compartilhados pelos testes: subir um servidor isolado numa
// porta aleatória e criar "clientes" de WebSocket com uma API de esperar por
// tipos de mensagem específicos (em vez de depender da ordem de chegada).

const WebSocket = require("ws");
const { criarServidor } = require("../app");
const { ANIMAIS } = require("../animais");

// Configuração usada nos testes: tudo bem mais rápido que uma partida real,
// pra suíte inteira rodar em segundos em vez de minutos.
const CONFIG_TESTE = {
  tempoLimitePortaMs: 300,
  tempoEscolhaPoderMs: 300,
  tempoEscolhaAlvoMs: 300,
  tempoLeituraMs: 80,
  tempoLimitePerguntaMs: 300,
  tempoLimiteLinkingMs: 300,
  tempoLimiteSortingMs: 300,
  pausaAposPortaMs: 30,
  pausaAposPortaGarantidaMs: 60,
  piramideDegraus: 4, // baixo de propósito, pra testar sem precisar simular dezenas de acertos
};

function subirServidorDeTeste(opcoes = {}) {
  const { servidorHttp, sala, wss } = criarServidor({ ...CONFIG_TESTE, ...opcoes });
  return new Promise((resolve) => {
    servidorHttp.listen(0, "127.0.0.1", () => {
      const porta = servidorHttp.address().port;
      resolve({
        sala,
        porta,
        // servidorHttp.close() só chama o callback depois que todas as conexões
        // fecharem sozinhas - como os clientes de teste mantêm o WebSocket
        // aberto, isso travaria pra sempre. Por isso derrubamos as conexões
        // à força antes de fechar o servidor.
        fechar: () =>
          new Promise((r) => {
            sala.encerrar(); // sem isso a partida continuaria rodando em segundo plano
            for (const cliente of wss.clients) cliente.terminate();
            servidorHttp.close(r);
          }),
      });
    });
  });
}

function criarCliente(porta) {
  const ws = new WebSocket(`ws://127.0.0.1:${porta}`);
  const filas = new Map(); // type -> mensagens já chegadas e ainda não consumidas
  const esperando = new Map(); // type -> resolvers pendentes, em ordem

  ws.on("message", (bruto) => {
    const msg = JSON.parse(bruto.toString());
    const pendentes = esperando.get(msg.type);
    if (pendentes && pendentes.length) {
      pendentes.shift()(msg);
    } else {
      if (!filas.has(msg.type)) filas.set(msg.type, []);
      filas.get(msg.type).push(msg);
    }
  });

  function aberto() {
    if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve) => ws.once("open", resolve));
  }

  function esperar(tipo, timeoutMs = 2000) {
    const fila = filas.get(tipo);
    if (fila && fila.length) return Promise.resolve(fila.shift());
    return new Promise((resolve, reject) => {
      if (!esperando.has(tipo)) esperando.set(tipo, []);
      const lista = esperando.get(tipo);

      const resolver = (msg) => {
        clearTimeout(timer);
        resolve(msg);
      };
      // se der timeout, o resolvedor precisa sair da fila - senão ele fica
      // "vivo" e engole silenciosamente a próxima mensagem desse tipo, que
      // nunca chega a quem realmente está esperando por ela depois.
      const timer = setTimeout(() => {
        const i = lista.indexOf(resolver);
        if (i !== -1) lista.splice(i, 1);
        reject(new Error(`timeout esperando mensagem "${tipo}"`));
      }, timeoutMs);

      lista.push(resolver);
    });
  }

  function enviar(objeto) {
    ws.send(JSON.stringify(objeto));
  }

  function fechar() {
    ws.close();
  }

  return { ws, aberto, esperar, enviar, fechar };
}

// Faz um jogador entrar na sala e devolve o cliente já pronto (após
// "entrouComSucesso"), pra não repetir esse bloco em todo teste. Por padrão
// já escolhe o primeiro animal livre (o servidor só deixa iniciar a partida
// quando todos têm animal); passe { escolherAnimal: false } pra ficar sem.
async function entrarNaSala(porta, nome, codigoSala, { escolherAnimal = true } = {}) {
  const cliente = criarCliente(porta);
  await cliente.aberto();
  cliente.enviar({ type: "entrar", nome, codigoSala });
  const boasVindas = await cliente.esperar("entrouComSucesso");
  let animalId = null;
  if (escolherAnimal) {
    const ocupados = new Set(boasVindas.jogadores.map((j) => j.animalId));
    animalId = ANIMAIS.find((a) => !ocupados.has(a.id)).id;
    cliente.enviar({ type: "escolherAnimal", animalId });
    await cliente.esperar("animalEscolhido");
  }
  return { cliente, jogadorId: boasVindas.jogadorId, token: boasVindas.token, ehAnfitriao: boasVindas.ehAnfitriao, animalId };
}

// Faz N jogadores entrarem, o anfitrião iniciar a partida, todos escolherem
// a primeira porta, e para assim que a escolha de poder chega - útil pra
// testar a etapa de "qual poder usar".
async function iniciarPartidaAteEscolhaPoder(porta, sala, nomes) {
  const jogadores = [];
  for (const nome of nomes) {
    jogadores.push(await entrarNaSala(porta, nome, sala.codigo));
  }
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPorta")));
  for (const j of jogadores) j.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("portaEscolhida")));
  const escolhasPoder = await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPoder")));
  return { jogadores, escolhasPoder };
}

// Continua de onde iniciarPartidaAteEscolhaPoder parou: cada jogador escolhe
// o poder indicado em `tipos` (mesmo índice de `jogadores`; null pra pular) e
// para assim que a tela de escolha de alvo chega.
async function avancarAteEscolhaAlvo(porta, sala, nomes, tipos) {
  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, nomes);
  jogadores.forEach((j, i) => {
    if (tipos[i]) j.cliente.enviar({ type: "escolherPoder", tipo: tipos[i] });
  });
  const escolhas = await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaAlvo")));
  return { jogadores, escolhas };
}

// Pula a escolha de poder (ninguém escolhe nada, a fase se resolve pelo
// timeout curto da config de teste) e chega até a próxima pergunta.
async function pularEscolhaDePoder(jogadores) {
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPoder")));
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaAlvo")));
}

// Joga as 3 Battle Rounds inteiras (sempre acertando, todos confirmando,
// sem usar Jogos de Poder) e para assim que o desafio de Linking começa.
// Útil pra testar Linking/Sorting sem repetir esse bloco enorme em cada teste.
async function avancarAteLinking(porta, sala, nomes) {
  const jogadores = [];
  for (const nome of nomes) {
    jogadores.push(await entrarNaSala(porta, nome, sala.codigo));
  }
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });

  for (let rodada = 0; rodada < sala.cfg.totalRodadas; rodada++) {
    await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPorta")));
    for (const j of jogadores) j.cliente.enviar({ type: "escolherPorta", indice: 0 });
    await Promise.all(jogadores.map((j) => j.cliente.esperar("portaEscolhida")));

    for (let pergunta = 0; pergunta < sala.cfg.perguntasPorRodada; pergunta++) {
      await pularEscolhaDePoder(jogadores);
      await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
      await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta")));
      const indiceCorreto = sala.perguntaAtual.indiceCorreto;
      for (const j of jogadores) j.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
      await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPergunta")));
      for (const j of jogadores) j.cliente.enviar({ type: "continuar" });
    }
  }

  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarLinking")));
  return { jogadores };
}

// Continua de onde avancarAteLinking parou: completa o Linking (todos
// acertando todos os pares, cada um com seu próprio embaralhamento) e para
// assim que o Sorting começa.
async function avancarAteSorting(porta, sala, nomes) {
  const { jogadores } = await avancarAteLinking(porta, sala, nomes);

  const totalPares = sala.linkingAtual.pares.length;
  for (const j of jogadores) {
    const progresso = sala.linkingAtual.progresso.get(j.jogadorId);
    for (let esquerdaIndex = 0; esquerdaIndex < totalPares; esquerdaIndex++) {
      const direitaIndex = progresso.direitaEmbaralhadaIndices.indexOf(esquerdaIndex);
      j.cliente.enviar({ type: "tentarPar", esquerdaIndex, direitaIndex });
    }
  }
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoLinking")));
  for (const j of jogadores) j.cliente.enviar({ type: "continuar" });

  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarSorting")));
  return { jogadores };
}

// Continua de onde avancarAteSorting parou: completa o Sorting (todos
// acertando tudo, cada um com sua própria ordem/gabarito) e para assim que a
// Pirâmide do Conhecimento começa, já com a primeira pergunta de cada um.
async function avancarAtePiramide(porta, sala, nomes) {
  const { jogadores } = await avancarAteSorting(porta, sala, nomes);

  for (const j of jogadores) {
    const progresso = sala.sortingAtual.progresso.get(j.jogadorId);
    for (let itemIndex = 0; itemIndex < progresso.itens.length; itemIndex++) {
      j.cliente.enviar({ type: "classificarItem", itemIndex, categoria: progresso.gabarito[itemIndex] });
    }
  }
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoSorting")));
  for (const j of jogadores) j.cliente.enviar({ type: "continuar" });

  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarPiramide")));
  const perguntas = await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPerguntaPiramide")));
  return { jogadores, perguntas };
}

module.exports = {
  subirServidorDeTeste,
  criarCliente,
  entrarNaSala,
  iniciarPartidaAteEscolhaPoder,
  avancarAteEscolhaAlvo,
  pularEscolhaDePoder,
  avancarAteLinking,
  avancarAteSorting,
  avancarAtePiramide,
  CONFIG_TESTE,
};

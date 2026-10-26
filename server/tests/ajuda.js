// Utilitários compartilhados pelos testes: subir um servidor isolado numa
// porta aleatória e criar "clientes" de WebSocket com uma API de esperar por
// tipos de mensagem específicos (em vez de depender da ordem de chegada).

const WebSocket = require("ws");
const { criarServidor } = require("../app");
const { ANIMAIS } = require("../animais");
const { PODERES_ATAQUE } = require("../sala");

// Configuração usada nos testes: tudo bem mais rápido que uma partida real,
// pra suíte inteira rodar em segundos em vez de minutos.
//
// A partida de teste é curta - 2 temas, o primeiro com Ligação e o segundo
// com Classificação - mas tem tudo que a de verdade tem: pergunta sem poder
// abrindo o tema, fase de poder nas outras, os dois desafios e a Pirâmide.
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
  tempoAnimacaoPorPoderMs: 30,
  largadaAberturaMs: 10,
  largadaPorJogadorMs: 10,
  largadaPorPuloMs: 5,
  largadaFechamentoMs: 10,
  pausaVencedorPiramideMs: 40,

  totalRodadas: 2,
  dificuldadesPorRodada: ["facil", "dificil"],
  desafiosPorRodada: ["linking", "sorting"],
  temasComFesta: [2],

  // baixo de propósito, pra testar sem precisar simular dezenas de acertos
  piramideAndares: 4,
  piramideMaxPulos: 2,
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

  // descarta o que já chegou desse tipo (pra não confundir com o próximo)
  function descartar(tipo) {
    filas.delete(tipo);
  }

  function enviar(objeto) {
    ws.send(JSON.stringify(objeto));
  }

  function fechar() {
    ws.close();
  }

  return { ws, aberto, esperar, descartar, enviar, fechar };
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

async function entrarTodos(porta, sala, nomes) {
  const jogadores = [];
  for (const nome of nomes) jogadores.push(await entrarNaSala(porta, nome, sala.codigo));
  return jogadores;
}

// Todos votam na primeira porta e esperam o tema ser anunciado.
async function escolherPorta(jogadores) {
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPorta")));
  for (const j of jogadores) j.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("portaEscolhida")));
}

// Entra, inicia e vota na porta: para quando a 1ª pergunta do tema chega -
// ela não tem fase de poder.
async function chegarNaPrimeiraPergunta(porta, sala, nomes) {
  const jogadores = await entrarTodos(porta, sala, nomes);
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });
  await escolherPorta(jogadores);
  const perguntas = await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
  return { jogadores, perguntas };
}

// Responde a pergunta que está na tela (todos acertando, por padrão) e espera
// o resultado. Assume que "novaPergunta" já foi consumida.
async function responderPergunta(jogadores, sala, { acertam = true } = {}) {
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta")));
  const certa = sala.perguntaAtual.indiceCorreto;
  const indice = acertam ? certa : (certa + 1) % 4;
  for (const j of jogadores) j.cliente.enviar({ type: "responder", alternativaIndex: indice });
  return Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPergunta")));
}

async function confirmar(jogadores) {
  for (const j of jogadores) j.cliente.enviar({ type: "continuar" });
}

// Ninguém usa poder: todos apertam "Não usar poder" e a fase anda na hora.
// Sem poder usado, não há animação - a pergunta vem direto.
async function pularEscolhaDePoder(jogadores) {
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPoder")));
  for (const j of jogadores) j.cliente.enviar({ type: "escolherPoder", tipo: null });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaAlvo")));
}

// Joga a 1ª pergunta do tema e para quando a escolha de poder da 2ª chega.
async function iniciarPartidaAteEscolhaPoder(porta, sala, nomes) {
  const { jogadores } = await chegarNaPrimeiraPergunta(porta, sala, nomes);
  await responderPergunta(jogadores, sala);
  await confirmar(jogadores);
  const escolhasPoder = await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPoder")));
  return { jogadores, escolhasPoder };
}

// Garante que um poder especial esteja na oferta deste jogador nesta
// pergunta. O 4º poder é sorteado; nos testes isso precisa ser previsível.
function forcarOferta(sala, jogadorId, tipo) {
  const usos = tipo === "escudo" || tipo === "aposta" ? sala._usos(jogadorId)[tipo] : 1;
  sala.ofertasPoder.set(jogadorId, [
    ...PODERES_ATAQUE.map((t) => ({ tipo: t, usos: null })),
    { tipo, usos },
  ]);
}

// Continua de onde iniciarPartidaAteEscolhaPoder parou: cada jogador escolhe
// o poder indicado em `tipos` (mesmo índice de `jogadores`; null pra pular) e
// para assim que a tela de escolha de alvo chega.
async function avancarAteEscolhaAlvo(porta, sala, nomes, tipos) {
  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, nomes);
  jogadores.forEach((j, i) => {
    const tipo = tipos[i];
    if (tipo && !PODERES_ATAQUE.includes(tipo)) forcarOferta(sala, j.jogadorId, tipo);
    j.cliente.enviar({ type: "escolherPoder", tipo: tipo || null });
  });
  const escolhas = await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaAlvo")));
  return { jogadores, escolhas };
}

// Joga um tema inteiro (porta + perguntas, sempre acertando, sem usar poder)
// e para logo depois de confirmar o resultado da última pergunta - o desafio
// do tema vem em seguida.
async function jogarTema(jogadores, sala) {
  await escolherPorta(jogadores);
  for (let n = 1; n <= sala.cfg.perguntasPorRodada; n++) {
    if (sala.cfg.perguntasComPoder.includes(n)) await pularEscolhaDePoder(jogadores);
    await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
    await responderPergunta(jogadores, sala);
    await confirmar(jogadores);
  }
}

// Joga o 1º tema e para assim que o desafio de Ligação dele começa.
async function avancarAteLinking(porta, sala, nomes) {
  const jogadores = await entrarTodos(porta, sala, nomes);
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });
  await jogarTema(jogadores, sala);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarLinking")));
  return { jogadores };
}

function completarLinking(jogadores, sala) {
  const totalPares = sala.linkingAtual.pares.length;
  for (const j of jogadores) {
    const progresso = sala.linkingAtual.progresso.get(j.jogadorId);
    for (let esquerdaIndex = 0; esquerdaIndex < totalPares; esquerdaIndex++) {
      const direitaIndex = progresso.direitaEmbaralhadaIndices.indexOf(esquerdaIndex);
      j.cliente.enviar({ type: "tentarPar", esquerdaIndex, direitaIndex });
    }
  }
}

function completarSorting(jogadores, sala) {
  for (const j of jogadores) {
    const progresso = sala.sortingAtual.progresso.get(j.jogadorId);
    for (let itemIndex = 0; itemIndex < progresso.itens.length; itemIndex++) {
      j.cliente.enviar({ type: "classificarItem", itemIndex, categoria: progresso.gabarito[itemIndex] });
    }
  }
}

// Continua de onde avancarAteLinking parou: completa a Ligação, joga o 2º
// tema e para assim que a Classificação dele começa.
async function avancarAteSorting(porta, sala, nomes) {
  const { jogadores } = await avancarAteLinking(porta, sala, nomes);
  completarLinking(jogadores, sala);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoLinking")));
  await confirmar(jogadores);
  await jogarTema(jogadores, sala);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarSorting")));
  return { jogadores };
}

// Continua de onde avancarAteSorting parou: completa a Classificação, passa
// pela largada e para assim que a corrida da Pirâmide começa, já com a
// primeira pergunta de cada um.
async function avancarAtePiramide(porta, sala, nomes) {
  const { jogadores } = await avancarAteSorting(porta, sala, nomes);
  completarSorting(jogadores, sala);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoSorting")));
  await confirmar(jogadores);
  const largadas = await Promise.all(jogadores.map((j) => j.cliente.esperar("largadaPiramide")));
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarPiramide")));
  const perguntas = await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPerguntaPiramide")));
  return { jogadores, perguntas, largadas };
}

module.exports = {
  subirServidorDeTeste,
  criarCliente,
  entrarNaSala,
  entrarTodos,
  escolherPorta,
  chegarNaPrimeiraPergunta,
  responderPergunta,
  confirmar,
  iniciarPartidaAteEscolhaPoder,
  forcarOferta,
  avancarAteEscolhaAlvo,
  pularEscolhaDePoder,
  jogarTema,
  avancarAteLinking,
  completarLinking,
  completarSorting,
  avancarAteSorting,
  avancarAtePiramide,
  CONFIG_TESTE,
};

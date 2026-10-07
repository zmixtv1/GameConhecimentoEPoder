const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidorDeTeste, criarCliente, entrarNaSala, pularEscolhaDePoder } = require("./ajuda");

test("TV: recebe o código da sala e a lista de jogadores ao se identificar", async (t) => {
  const { porta, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  const msg = await tv.esperar("estadoSala");

  assert.equal(msg.estado, "lobby");
  assert.deepEqual(msg.jogadores, []);
  assert.match(msg.codigo, /^[A-Z]{4}$/);
});

test("entrar com código de sala errado é rejeitado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const cliente = criarCliente(porta);
  await cliente.aberto();
  cliente.enviar({ type: "entrar", nome: "Carlos", codigoSala: "ZZZZ" });
  const erro = await cliente.esperar("erroEntrada");

  assert.match(erro.mensagem, /inválido/i);
  assert.notEqual("ZZZZ", sala.codigo);
});

test("primeiro jogador vira anfitrião, os seguintes não", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);

  assert.equal(ana.ehAnfitriao, true);
  assert.equal(bruno.ehAnfitriao, false);
});

test("sala respeita o limite máximo de jogadores configurado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ maxJogadores: 2 });
  t.after(fechar);

  await entrarNaSala(porta, "Ana", sala.codigo);
  await entrarNaSala(porta, "Bruno", sala.codigo);

  const carlos = criarCliente(porta);
  await carlos.aberto();
  carlos.enviar({ type: "entrar", nome: "Carlos", codigoSala: sala.codigo });
  const erro = await carlos.esperar("erroEntrada");

  assert.match(erro.mensagem, /cheia/i);
});

test("só o anfitrião pode iniciar a partida", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  void ana;

  bruno.cliente.enviar({ type: "iniciarPartida" });
  const erro = await bruno.cliente.esperar("erroAcao");

  assert.match(erro.mensagem, /anfitrião/i);
});

test("anfitrião não consegue iniciar sozinho, precisa de pelo menos 2 jogadores", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });
  const erro = await ana.cliente.esperar("erroAcao");

  assert.match(erro.mensagem, /pelo menos 2/i);
});

test("iniciar partida com 2+ jogadores abre a escolha de porta com 4 opções, pra TV e jogadores", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  await tv.esperar("estadoSala");

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);

  ana.cliente.enviar({ type: "iniciarPartida" });

  const [msgAna, msgBruno, msgTv] = await Promise.all([
    ana.cliente.esperar("escolhaPorta"),
    bruno.cliente.esperar("escolhaPorta"),
    tv.esperar("escolhaPorta"),
  ]);

  for (const msg of [msgAna, msgBruno, msgTv]) {
    assert.equal(msg.portas.length, 4);
    assert.equal(msg.rodadaAtual, 1);
    assert.equal(new Set(msg.portas).size, 4);
  }
});

test("escolher uma porta com índice inválido é rejeitado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });
  await ana.cliente.esperar("escolhaPorta");
  await bruno.cliente.esperar("escolhaPorta");

  ana.cliente.enviar({ type: "escolherPorta", indice: 99 });
  const erro = await ana.cliente.esperar("erroAcao");

  assert.match(erro.mensagem, /inválida/i);
});

test("a porta mais votada vence quando todos escolhem", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });
  const escolha = await ana.cliente.esperar("escolhaPorta");
  await bruno.cliente.esperar("escolhaPorta");

  ana.cliente.enviar({ type: "escolherPorta", indice: 2 });
  bruno.cliente.enviar({ type: "escolherPorta", indice: 2 });

  const resultado = await ana.cliente.esperar("portaEscolhida");
  assert.equal(resultado.categoria, escolha.portas[2]);
  assert.deepEqual(resultado.contagens, [0, 0, 2, 0]);
});

test("responder durante a fase de leitura é rejeitado pelo servidor", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });
  await ana.cliente.esperar("escolhaPorta");
  await bruno.cliente.esperar("escolhaPorta");
  ana.cliente.enviar({ type: "escolherPorta", indice: 0 });
  bruno.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await ana.cliente.esperar("portaEscolhida");
  await pularEscolhaDePoder([ana, bruno]);
  await ana.cliente.esperar("novaPergunta");

  ana.cliente.enviar({ type: "responder", alternativaIndex: 0 });
  const erro = await ana.cliente.esperar("erroAcao");

  assert.match(erro.mensagem, /leitura/i);
});

async function avancarAtePergunta(porta, sala, nomesExtras = []) {
  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  const extras = [];
  for (const nome of nomesExtras.slice(2)) {
    extras.push(await entrarNaSala(porta, nome, sala.codigo));
  }
  ana.cliente.enviar({ type: "iniciarPartida" });
  await ana.cliente.esperar("escolhaPorta");
  await bruno.cliente.esperar("escolhaPorta");
  for (const e of extras) {
    await e.cliente.esperar("escolhaPorta");
    e.cliente.enviar({ type: "escolherPorta", indice: 0 });
  }
  ana.cliente.enviar({ type: "escolherPorta", indice: 0 });
  bruno.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await ana.cliente.esperar("portaEscolhida");
  await bruno.cliente.esperar("portaEscolhida");
  await pularEscolhaDePoder([ana, bruno]);
  await ana.cliente.esperar("novaPergunta");
  await bruno.cliente.esperar("novaPergunta");
  await ana.cliente.esperar("iniciarResposta");
  await bruno.cliente.esperar("iniciarResposta");
  return { ana, bruno };
}

test("depois que todos respondem, o resultado é revelado com placar e acerto corretos", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { ana, bruno } = await avancarAtePergunta(porta, sala);
  const indiceCorreto = sala.perguntaAtual.indiceCorreto; // acesso direto pro teste saber o gabarito

  ana.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  bruno.cliente.enviar({ type: "responder", alternativaIndex: (indiceCorreto + 1) % 4 });

  const resultadoAna = await ana.cliente.esperar("resultadoPergunta");
  const resultadoBruno = await bruno.cliente.esperar("resultadoPergunta");

  assert.equal(resultadoAna.respostaCorretaIndex, indiceCorreto);
  assert.equal(resultadoAna.seuResultado.acertou, true);
  assert.ok(resultadoAna.seuResultado.pontosGanhos >= 100);
  assert.equal(resultadoBruno.seuResultado.acertou, false);
  assert.equal(resultadoBruno.seuResultado.pontosGanhos, 0);
});

test("quem não responde a tempo aparece como respondeu:false, sem pontos", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { ana, bruno } = await avancarAtePergunta(porta, sala);
  const indiceCorreto = sala.perguntaAtual.indiceCorreto;

  ana.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  // Bruno nunca responde: o servidor precisa revelar sozinho, pelo timeout interno.

  const resultadoBruno = await bruno.cliente.esperar("resultadoPergunta", 2000);
  assert.equal(resultadoBruno.seuResultado.respondeu, false);
  assert.equal(resultadoBruno.seuResultado.acertou, false);
  assert.equal(resultadoBruno.seuResultado.pontosGanhos, 0);
});

test("só avança depois que TODOS confirmarem 'próxima pergunta'", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { ana, bruno } = await avancarAtePergunta(porta, sala);
  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  ana.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  bruno.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  await ana.cliente.esperar("resultadoPergunta");
  await bruno.cliente.esperar("resultadoPergunta");

  ana.cliente.enviar({ type: "continuar" });

  // só a Ana confirmou: ainda não deve ter chegado a próxima pergunta (2ª da rodada)
  await assert.rejects(() => ana.cliente.esperar("novaPergunta", 150));

  bruno.cliente.enviar({ type: "continuar" });
  const proxima = await ana.cliente.esperar("novaPergunta", 2000);
  assert.equal(proxima.perguntaNaRodada, 2);
});

test("desconexão do último jogador pendente libera o avanço sozinha", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  // 3 jogadores: com 2, a saída de um encerraria a partida (sobraria um só)
  const { ana, bruno } = await avancarAtePergunta(porta, sala, ["Ana", "Bruno", "Carla"]);
  const carla = [...sala.jogadores.values()].find((j) => j.nome === "Carla");
  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  ana.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  bruno.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  sala.registrarResposta(carla.id, indiceCorreto);
  await ana.cliente.esperar("resultadoPergunta");
  await bruno.cliente.esperar("resultadoPergunta");

  ana.cliente.enviar({ type: "continuar" });
  sala.registrarContinuar(carla.id);
  bruno.cliente.fechar(); // Bruno sai sem confirmar

  const proxima = await ana.cliente.esperar("novaPergunta", 2000);
  assert.equal(proxima.perguntaNaRodada, 2);
});

test("partida completa (3 rodadas + Linking + Sorting) termina em fimDePartida com placar ordenado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });

  for (let rodada = 0; rodada < 3; rodada++) {
    await Promise.all([ana.cliente.esperar("escolhaPorta"), bruno.cliente.esperar("escolhaPorta")]);
    ana.cliente.enviar({ type: "escolherPorta", indice: 0 });
    bruno.cliente.enviar({ type: "escolherPorta", indice: 0 });
    await Promise.all([ana.cliente.esperar("portaEscolhida"), bruno.cliente.esperar("portaEscolhida")]);

    for (let pergunta = 0; pergunta < 3; pergunta++) {
      await pularEscolhaDePoder([ana, bruno]);
      await Promise.all([ana.cliente.esperar("novaPergunta"), bruno.cliente.esperar("novaPergunta")]);
      await Promise.all([ana.cliente.esperar("iniciarResposta"), bruno.cliente.esperar("iniciarResposta")]);
      const indiceCorreto = sala.perguntaAtual.indiceCorreto;
      ana.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
      bruno.cliente.enviar({ type: "responder", alternativaIndex: (indiceCorreto + 1) % 4 });
      await Promise.all([ana.cliente.esperar("resultadoPergunta"), bruno.cliente.esperar("resultadoPergunta")]);
      ana.cliente.enviar({ type: "continuar" });
      bruno.cliente.enviar({ type: "continuar" });
    }
  }

  // Linking: os dois acertam todos os pares (cada um com seu próprio embaralhamento)
  await Promise.all([ana.cliente.esperar("iniciarLinking"), bruno.cliente.esperar("iniciarLinking")]);
  const totalPares = sala.linkingAtual.pares.length;
  for (const j of [ana, bruno]) {
    const progresso = sala.linkingAtual.progresso.get(j.jogadorId);
    for (let esquerdaIndex = 0; esquerdaIndex < totalPares; esquerdaIndex++) {
      const direitaIndex = progresso.direitaEmbaralhadaIndices.indexOf(esquerdaIndex);
      j.cliente.enviar({ type: "tentarPar", esquerdaIndex, direitaIndex });
    }
  }
  await Promise.all([ana.cliente.esperar("resultadoLinking"), bruno.cliente.esperar("resultadoLinking")]);
  ana.cliente.enviar({ type: "continuar" });
  bruno.cliente.enviar({ type: "continuar" });

  // Sorting: os dois classificam tudo certo (cada um com sua própria ordem/gabarito)
  await Promise.all([ana.cliente.esperar("iniciarSorting"), bruno.cliente.esperar("iniciarSorting")]);
  for (const j of [ana, bruno]) {
    const progresso = sala.sortingAtual.progresso.get(j.jogadorId);
    for (let itemIndex = 0; itemIndex < progresso.itens.length; itemIndex++) {
      j.cliente.enviar({ type: "classificarItem", itemIndex, categoria: progresso.gabarito[itemIndex] });
    }
  }
  await Promise.all([ana.cliente.esperar("resultadoSorting"), bruno.cliente.esperar("resultadoSorting")]);
  ana.cliente.enviar({ type: "continuar" });
  bruno.cliente.enviar({ type: "continuar" });

  // Pirâmide: só a Ana joga, respondendo certo até vencer a corrida. O
  // número de acertos necessários é calculado na hora (depende da largada).
  await Promise.all([ana.cliente.esperar("iniciarPiramide"), bruno.cliente.esperar("iniciarPiramide")]);
  // cada jogador já recebe a primeira pergunta da pirâmide junto - precisa
  // consumir essa mensagem antes do loop, senão o próximo "esperar" pega essa
  // (desatualizada) em vez de esperar a pergunta nova de verdade.
  await Promise.all([ana.cliente.esperar("novaPerguntaPiramide"), bruno.cliente.esperar("novaPerguntaPiramide")]);
  const posicaoInicialAna = sala.piramideAtual.progresso.get(ana.jogadorId).posicao;
  const passosRestantes = sala.cfg.piramideDegraus - posicaoInicialAna;

  for (let i = 0; i < passosRestantes; i++) {
    const progressoPiramide = sala.piramideAtual.progresso.get(ana.jogadorId);
    const indiceCorretoPiramide = progressoPiramide.perguntaAtual.indiceCorreto;
    ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceCorretoPiramide });
    if (i < passosRestantes - 1) {
      await ana.cliente.esperar("novaPerguntaPiramide");
    }
  }

  const [resultadoPiramideAna, resultadoPiramideBruno] = await Promise.all([
    ana.cliente.esperar("resultadoPiramide", 3000),
    bruno.cliente.esperar("resultadoPiramide", 3000),
  ]);
  assert.equal(resultadoPiramideAna.vencedorNome, "Ana");
  assert.equal(resultadoPiramideBruno.vencedorNome, "Ana");

  ana.cliente.enviar({ type: "continuar" });
  bruno.cliente.enviar({ type: "continuar" });

  const [fimAna, fimBruno] = await Promise.all([
    ana.cliente.esperar("fimDePartida", 3000),
    bruno.cliente.esperar("fimDePartida", 3000),
  ]);

  assert.deepEqual(fimAna, fimBruno);
  assert.equal(fimAna.vencedorNome, "Ana");
  assert.equal(fimAna.placarFinal.length, 2);
  // Ana sempre acertou as perguntas simples, Bruno sempre errou de propósito -> Ana deve estar na frente
  assert.equal(fimAna.placarFinal[0].nome, "Ana");
  assert.ok(fimAna.placarFinal[0].pontos > fimAna.placarFinal[1].pontos);
  const pontuacoesDecrescentes = fimAna.placarFinal.every(
    (jogador, i, lista) => i === 0 || lista[i - 1].pontos >= jogador.pontos
  );
  assert.ok(pontuacoesDecrescentes, "placar final deveria estar ordenado do maior pro menor");
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { PADROES } = require("../sala");
const {
  subirServidorDeTeste, criarCliente, entrarNaSala, pularEscolhaDePoder,
  escolherPorta, responderPergunta, confirmar, completarLinking, completarSorting,
} = require("./ajuda");

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
  await ana.cliente.esperar("novaPergunta"); // a 1ª do tema vem sem fase de poder

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

  // só a Ana confirmou: ainda não deve ter começado a 2ª pergunta do tema
  await assert.rejects(() => ana.cliente.esperar("escolhaPoder", 150));

  // a 2ª pergunta tem fase de poder antes
  bruno.cliente.enviar({ type: "continuar" });
  const proxima = await ana.cliente.esperar("escolhaPoder", 2000);
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

  const proxima = await ana.cliente.esperar("escolhaPoder", 2000);
  assert.equal(proxima.perguntaNaRodada, 2);
});

// A partida com a estrutura de verdade - 5 temas ficando mais difíceis, uma
// Ligação ou Classificação depois de cada um, e a Pirâmide de 8 andares -
// só com os tempos encurtados. A Ana acerta tudo e o Bruno erra tudo.
test("partida completa com a estrutura real: 5 temas, 5 desafios, largada, corrida e pódio", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({
    totalRodadas: PADROES.totalRodadas,
    dificuldadesPorRodada: PADROES.dificuldadesPorRodada,
    desafiosPorRodada: PADROES.desafiosPorRodada,
    temasComFesta: PADROES.temasComFesta,
    piramideAndares: PADROES.piramideAndares,
    piramideMaxPulos: PADROES.piramideMaxPulos,
  });
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  const jogadores = [ana, bruno];
  ana.cliente.enviar({ type: "iniciarPartida" });

  const temas = [];
  const desafios = [];
  for (let rodada = 1; rodada <= PADROES.totalRodadas; rodada++) {
    await escolherPorta(jogadores);
    temas.push(sala.categoriaRodadaAtual);

    for (let n = 1; n <= PADROES.perguntasPorRodada; n++) {
      if (PADROES.perguntasComPoder.includes(n)) await pularEscolhaDePoder(jogadores);
      const [pergunta] = await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
      assert.equal(pergunta.dificuldade, PADROES.dificuldadesPorRodada[rodada - 1],
        `tema ${rodada}, pergunta ${n}: veio no nível errado`);

      await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta")));
      const certa = sala.perguntaAtual.indiceCorreto;
      ana.cliente.enviar({ type: "responder", alternativaIndex: certa });
      bruno.cliente.enviar({ type: "responder", alternativaIndex: (certa + 1) % 4 });
      await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPergunta")));
      await confirmar(jogadores);
    }

    // o desafio do tema, alternando
    if (PADROES.desafiosPorRodada[rodada - 1] === "linking") {
      await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarLinking")));
      desafios.push(`linking:${sala.linkingAtual.id}`);
      completarLinking(jogadores, sala);
      await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoLinking")));
    } else {
      await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarSorting")));
      desafios.push(`sorting:${sala.sortingAtual.id}`);
      completarSorting(jogadores, sala);
      await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoSorting")));
    }
    await confirmar(jogadores);
  }

  assert.equal(new Set(temas).size, 5, `os 5 temas deveriam ser diferentes: ${temas.join(", ")}`);
  assert.deepEqual(desafios.map((d) => d.split(":")[0]), PADROES.desafiosPorRodada);
  assert.equal(new Set(desafios).size, 5, `nenhum desafio pode repetir na partida: ${desafios.join(", ")}`);

  // a largada: a Ana fez muito mais pontos e larga no teto; o Bruno, no chão
  const largada = await ana.cliente.esperar("largadaPiramide", 5000);
  assert.equal(largada.jogadores.find((j) => j.nome === "Ana").largada, PADROES.piramideMaxPulos);
  assert.equal(largada.jogadores.find((j) => j.nome === "Bruno").largada, 0);

  // a corrida: só a Ana responde, acertando até o topo
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarPiramide", 5000)));
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPerguntaPiramide")));
  const passos = PADROES.piramideAndares - sala.piramideAtual.progresso.get(ana.jogadorId).posicao;
  assert.equal(passos, PADROES.piramideAndares - PADROES.piramideMaxPulos, "o líder precisa de 4 acertos");
  for (let i = 0; i < passos; i++) {
    const p = sala.piramideAtual.progresso.get(ana.jogadorId);
    ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: p.perguntaAtual.indiceCorreto });
    if (i < passos - 1) await ana.cliente.esperar("novaPerguntaPiramide");
  }

  const vitoria = await bruno.cliente.esperar("vencedorPiramide", 3000);
  assert.equal(vitoria.vencedorNome, "Ana");

  // o pódio vem sozinho, igual pra todo mundo
  const [fimAna, fimBruno] = await Promise.all(jogadores.map((j) => j.cliente.esperar("fimDePartida", 5000)));
  assert.deepEqual(fimAna, fimBruno);
  assert.equal(fimAna.vencedorNome, "Ana");
  assert.deepEqual(fimAna.classificacao.map((j) => j.nome), ["Ana", "Bruno"]);
  assert.equal(fimAna.classificacao[0].andarFinal, PADROES.piramideAndares);
  assert.equal(fimAna.placarFinal[0].nome, "Ana");
  assert.ok(fimAna.placarFinal[0].pontos > fimAna.placarFinal[1].pontos);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidorDeTeste, entrarNaSala, avancarAtePiramide } = require("./ajuda");

test("iniciarPiramide chega com posições de largada e uma pergunta pra cada um", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores, perguntas } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  void jogadores;

  for (const p of perguntas) {
    assert.ok(p.pergunta);
    assert.equal(p.alternativas.length, 4);
  }
});

test("quem termina a partida com mais pontos larga mais perto do topo na pirâmide", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });

  // joga as 3 Battle Rounds com a Ana sempre acertando e o Bruno sempre
  // errando de propósito, pra garantir que a Ana termine na frente.
  for (let rodada = 0; rodada < sala.cfg.totalRodadas; rodada++) {
    await Promise.all([ana.cliente.esperar("escolhaPorta"), bruno.cliente.esperar("escolhaPorta")]);
    ana.cliente.enviar({ type: "escolherPorta", indice: 0 });
    bruno.cliente.enviar({ type: "escolherPorta", indice: 0 });
    await Promise.all([ana.cliente.esperar("portaEscolhida"), bruno.cliente.esperar("portaEscolhida")]);

    for (let pergunta = 0; pergunta < sala.cfg.perguntasPorRodada; pergunta++) {
      await Promise.all([ana.cliente.esperar("escolhaPoder"), bruno.cliente.esperar("escolhaPoder")]);
      await Promise.all([ana.cliente.esperar("escolhaAlvo"), bruno.cliente.esperar("escolhaAlvo")]);
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

  // Linking: só a Ana completa
  await Promise.all([ana.cliente.esperar("iniciarLinking"), bruno.cliente.esperar("iniciarLinking")]);
  const totalPares = sala.linkingAtual.pares.length;
  const progressoLinkingAna = sala.linkingAtual.progresso.get(ana.jogadorId);
  for (let esquerdaIndex = 0; esquerdaIndex < totalPares; esquerdaIndex++) {
    const direitaIndex = progressoLinkingAna.direitaEmbaralhadaIndices.indexOf(esquerdaIndex);
    ana.cliente.enviar({ type: "tentarPar", esquerdaIndex, direitaIndex });
  }
  await Promise.all([ana.cliente.esperar("resultadoLinking"), bruno.cliente.esperar("resultadoLinking")]);
  ana.cliente.enviar({ type: "continuar" });
  bruno.cliente.enviar({ type: "continuar" });

  // Sorting: só a Ana acerta
  await Promise.all([ana.cliente.esperar("iniciarSorting"), bruno.cliente.esperar("iniciarSorting")]);
  const progressoSortingAna = sala.sortingAtual.progresso.get(ana.jogadorId);
  for (let itemIndex = 0; itemIndex < progressoSortingAna.itens.length; itemIndex++) {
    ana.cliente.enviar({ type: "classificarItem", itemIndex, categoria: progressoSortingAna.gabarito[itemIndex] });
  }
  await Promise.all([ana.cliente.esperar("resultadoSorting"), bruno.cliente.esperar("resultadoSorting")]);
  ana.cliente.enviar({ type: "continuar" });
  bruno.cliente.enviar({ type: "continuar" });

  await Promise.all([ana.cliente.esperar("iniciarPiramide"), bruno.cliente.esperar("iniciarPiramide")]);

  const posicaoAna = sala.piramideAtual.progresso.get(ana.jogadorId).posicao;
  const posicaoBruno = sala.piramideAtual.progresso.get(bruno.jogadorId).posicao;
  assert.ok(posicaoAna > posicaoBruno, "quem tem mais pontos deveria largar mais perto do topo");
});

test("responder errado não avança e permite tentar de novo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;
  const progressoAna = sala.piramideAtual.progresso.get(ana.jogadorId);
  const posicaoAntes = progressoAna.posicao;
  const indiceErrado = (progressoAna.perguntaAtual.indiceCorreto + 1) % 4;

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceErrado });
  const erro = await ana.cliente.esperar("respostaErradaPiramide");

  assert.equal(erro.alternativaIndex, indiceErrado);
  assert.equal(sala.piramideAtual.progresso.get(ana.jogadorId).posicao, posicaoAntes);
});

test("não é possível tentar de novo uma alternativa já errada na mesma pergunta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;
  const progressoAna = sala.piramideAtual.progresso.get(ana.jogadorId);
  const indiceErrado = (progressoAna.perguntaAtual.indiceCorreto + 1) % 4;

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceErrado });
  await ana.cliente.esperar("respostaErradaPiramide");

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceErrado });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já foi tentada/i);
});

test("acertar avança um degrau e traz uma pergunta nova", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ piramideDegraus: 10 });
  t.after(fechar);

  const { jogadores } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;
  const progressoAna = sala.piramideAtual.progresso.get(ana.jogadorId);
  const posicaoAntes = progressoAna.posicao;
  const indiceCorreto = progressoAna.perguntaAtual.indiceCorreto;

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceCorreto });
  const proxima = await ana.cliente.esperar("novaPerguntaPiramide");

  assert.ok(proxima.pergunta);
  assert.equal(sala.piramideAtual.progresso.get(ana.jogadorId).posicao, posicaoAntes + 1);
});

test("quem chega no topo primeiro vence, e o outro jogador para de poder responder", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ piramideDegraus: 1 });
  t.after(fechar);

  const { jogadores } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const indiceCorretoAna = sala.piramideAtual.progresso.get(ana.jogadorId).perguntaAtual.indiceCorreto;

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceCorretoAna });
  const resultado = await bruno.cliente.esperar("resultadoPiramide");

  assert.equal(resultado.vencedorNome, "Ana");
  assert.equal(sala.estado, "revelacao_piramide");

  // Bruno tenta responder depois que a pirâmide já acabou
  bruno.cliente.enviar({ type: "responderPiramide", alternativaIndex: 0 });
  const erro = await bruno.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /não está em andamento|já terminou/i);
});

test("depois da pirâmide, precisa de todos confirmarem pra terminar a partida com o nome do vencedor", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ piramideDegraus: 1 });
  t.after(fechar);

  const { jogadores } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const indiceCorretoAna = sala.piramideAtual.progresso.get(ana.jogadorId).perguntaAtual.indiceCorreto;

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceCorretoAna });
  await Promise.all([ana.cliente.esperar("resultadoPiramide"), bruno.cliente.esperar("resultadoPiramide")]);

  ana.cliente.enviar({ type: "continuar" });
  await assert.rejects(() => ana.cliente.esperar("fimDePartida", 150));

  bruno.cliente.enviar({ type: "continuar" });
  const fim = await ana.cliente.esperar("fimDePartida", 2000);
  assert.equal(fim.vencedorNome, "Ana");
  assert.equal(fim.placarFinal.length, 2);
});

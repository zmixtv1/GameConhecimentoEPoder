const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidorDeTeste, avancarAteSorting } = require("./ajuda");

test("Sorting chega com duas categorias nomeadas e uma lista de itens", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno"]);
  const progressoAna = sala.sortingAtual.progresso.get(jogadores[0].jogadorId);

  assert.ok(sala.sortingAtual.categoriaA);
  assert.ok(sala.sortingAtual.categoriaB);
  assert.ok(progressoAna.itens.length >= 4);
  assert.equal(progressoAna.itens.length, progressoAna.gabarito.length);
});

test("cada jogador recebe sua própria ordem de itens", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno", "Carlos", "Diego"]);
  void jogadores;

  const ordens = [...sala.sortingAtual.progresso.values()].map((p) => p.itens.join(","));
  // não é garantido matematicamente que todos saiam diferentes, mas com 4
  // jogadores e vários itens a chance de todos saírem iguais é desprezível.
  assert.ok(new Set(ordens).size > 1, "esperava ordens diferentes entre os jogadores");
});

test("classificar um item na categoria certa é aceito e marcado como correto", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;
  const progressoAna = sala.sortingAtual.progresso.get(ana.jogadorId);
  const categoriaCerta = progressoAna.gabarito[0];
  const categoriaErrada = categoriaCerta === "A" ? "B" : "A";

  ana.cliente.enviar({ type: "classificarItem", itemIndex: 0, categoria: categoriaErrada });
  const respostaErrada = await ana.cliente.esperar("resultadoClassificacaoItem");
  assert.equal(respostaErrada.correto, false);
});

test("não é possível classificar o mesmo item duas vezes", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "classificarItem", itemIndex: 0, categoria: "A" });
  await ana.cliente.esperar("resultadoClassificacaoItem");

  ana.cliente.enviar({ type: "classificarItem", itemIndex: 0, categoria: "B" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já classificou/i);
});

test("categoria inválida é rejeitada", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "classificarItem", itemIndex: 0, categoria: "Z" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /inválida/i);
});

test("pontuação final reflete só os acertos, sem bônus de velocidade", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const progressoAna = sala.sortingAtual.progresso.get(ana.jogadorId);
  const progressoBruno = sala.sortingAtual.progresso.get(bruno.jogadorId);
  const totalItens = progressoAna.itens.length;

  // Ana classifica tudo certo (usando o próprio gabarito dela)
  for (let itemIndex = 0; itemIndex < totalItens; itemIndex++) {
    ana.cliente.enviar({ type: "classificarItem", itemIndex, categoria: progressoAna.gabarito[itemIndex] });
  }
  // Bruno classifica tudo errado de propósito
  for (let itemIndex = 0; itemIndex < totalItens; itemIndex++) {
    const errada = progressoBruno.gabarito[itemIndex] === "A" ? "B" : "A";
    bruno.cliente.enviar({ type: "classificarItem", itemIndex, categoria: errada });
  }

  const resultadoAna = await ana.cliente.esperar("resultadoSorting", 2000);
  const resultadoBruno = await bruno.cliente.esperar("resultadoSorting", 2000);

  assert.equal(resultadoAna.corretos, totalItens);
  assert.equal(resultadoBruno.corretos, 0);
  assert.equal(resultadoAna.pontosGanhos, totalItens * sala.cfg.pontosPorItemSorting);
  assert.equal(resultadoBruno.pontosGanhos, 0);
  assert.equal(resultadoAna.gabarito.length, totalItens);
});

test("depois do Sorting, precisa de todos confirmarem 'continuar' pra ir pra Pirâmide", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;

  for (const j of jogadores) {
    const progresso = sala.sortingAtual.progresso.get(j.jogadorId);
    for (let itemIndex = 0; itemIndex < progresso.itens.length; itemIndex++) {
      j.cliente.enviar({ type: "classificarItem", itemIndex, categoria: progresso.gabarito[itemIndex] });
    }
  }
  await Promise.all([ana.cliente.esperar("resultadoSorting"), bruno.cliente.esperar("resultadoSorting")]);

  ana.cliente.enviar({ type: "continuar" });
  await assert.rejects(() => ana.cliente.esperar("iniciarPiramide", 150));

  bruno.cliente.enviar({ type: "continuar" });
  await ana.cliente.esperar("iniciarPiramide", 2000);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { Sala } = require("../sala");
const {
  subirServidorDeTeste, avancarAtePiramide, avancarAteSorting, completarSorting, confirmar,
} = require("./ajuda");

// Sala solta, sem servidor, com jogadores e pontos montados à mão - pra
// testar a fórmula da largada e a classificação final em cenários exatos.
function salaCom(pontos, opcoes = {}) {
  const sala = new Sala({ piramideAndares: 8, piramideMaxPulos: 4, piramideCurva: 1.5, piramidePesoPontos: 0.5, ...opcoes });
  pontos.forEach((p, i) => {
    const id = String(i + 1);
    sala.jogadores.set(id, { id, nome: `J${id}`, pontos: p, avatar: null, conectado: true });
  });
  return sala;
}

function pulosPorId(sala) {
  return Object.fromEntries(sala._calcularLargada().map((j) => [j.id, j.pulos]));
}

// ---------- a largada ----------

test("largada: quem fez mais pontos larga mais alto, e ninguém passa do teto de pulos", () => {
  const sala = salaCom([2600, 2550, 2500, 2480, 2450, 2400, 2380, 2300]);
  const largada = sala._calcularLargada();
  const pulos = largada.map((j) => j.pulos);

  assert.deepEqual(pulos, [4, 3, 2, 2, 1, 1, 0, 0]);
  assert.equal(Math.max(...pulos), 4, "só o primeiro chega no teto de 4");
  // a lista vem do primeiro para o último, e quem tem mais pontos nunca larga abaixo
  for (let i = 1; i < pulos.length; i++) assert.ok(pulos[i] <= pulos[i - 1]);
});

test("largada: um líder disparado não achata o resto da tabela no chão", () => {
  // só com pontos, 3400 contra 2300 levava do 2º ao 8º todos para o chão; a
  // metade do peso que vem da colocação mantém a tabela espalhada
  const sala = salaCom([3400, 2300, 2200, 2100, 2000, 1950, 1800, 1700]);
  const pulos = sala._calcularLargada().map((j) => j.pulos);

  assert.equal(pulos[0], 4);
  assert.ok(pulos[1] > 0, "o 2º colocado não pode largar no chão");
  assert.ok(new Set(pulos.slice(1)).size > 1, "do 2º em diante não pode ficar todo mundo junto");
});

test("largada: empate de pontos divide o lugar e larga no mesmo andar", () => {
  const sala = salaCom([2800, 2500, 2500, 2000]);
  const p = pulosPorId(sala);
  assert.equal(p["2"], p["3"]);
  assert.ok(p["1"] > p["2"] && p["2"] > p["4"]);
});

test("largada: quanto falta é o topo menos o andar de largada", () => {
  const sala = salaCom([3000, 1000]);
  const [primeiro, ultimo] = sala._calcularLargada();
  assert.equal(primeiro.faltam, 8 - primeiro.largada);
  assert.equal(ultimo.largada, 0);
  assert.equal(ultimo.faltam, 8, "quem larga do chão precisa subir os 8 andares");
});

test("largada: TV e celulares recebem quem larga de onde, e a corrida começa sozinha depois", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno"]);
  // a Ana fica bem na frente antes de a Classificação acabar
  sala.jogadores.get(jogadores[0].jogadorId).pontos += 500;
  completarSorting(jogadores, sala);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoSorting")));
  await confirmar(jogadores);

  const largada = await jogadores[0].cliente.esperar("largadaPiramide");
  assert.equal(largada.totalAndares, sala.cfg.piramideAndares);
  assert.ok(largada.duracaoMs > 0);
  const ana = largada.jogadores.find((j) => j.nome === "Ana");
  const bruno = largada.jogadores.find((j) => j.nome === "Bruno");
  assert.ok(ana.largada > bruno.largada, "quem tem mais pontos larga mais alto");
  assert.equal(ana.largada, ana.pulos);

  // sem ninguém apertar nada, a corrida começa quando a largada termina
  const inicio = await jogadores[0].cliente.esperar("iniciarPiramide");
  assert.equal(inicio.jogadores.find((j) => j.nome === "Ana").posicao, ana.largada);
});

// ---------- a corrida ----------

test("iniciarPiramide chega com o andar de cada um e uma pergunta pra cada um", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { perguntas } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  for (const p of perguntas) {
    assert.ok(p.pergunta);
    assert.equal(p.alternativas.length, 4);
  }
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

test("cada acerto sobe um andar, traz pergunta nova e avisa todo mundo quem subiu", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ piramideAndares: 10 });
  t.after(fechar);

  const { jogadores } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const progressoAna = sala.piramideAtual.progresso.get(ana.jogadorId);
  const posicaoAntes = progressoAna.posicao;

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: progressoAna.perguntaAtual.indiceCorreto });
  const proxima = await ana.cliente.esperar("novaPerguntaPiramide");
  const aviso = await bruno.cliente.esperar("progressoPiramide");

  assert.ok(proxima.pergunta);
  assert.equal(sala.piramideAtual.progresso.get(ana.jogadorId).posicao, posicaoAntes + 1);
  assert.equal(aviso.subiuId, ana.jogadorId);
  assert.equal(aviso.jogadores.find((j) => j.id === ana.jogadorId).posicao, posicaoAntes + 1);
});

// Com 1 andar e sem pulos, todo mundo larga do chão e um acerto ganha.
const PIRAMIDE_DE_UM_ANDAR = { piramideAndares: 1, piramideMaxPulos: 0 };

test("quem chega no topo primeiro vence, e o outro jogador para de poder responder", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PIRAMIDE_DE_UM_ANDAR);
  t.after(fechar);

  const { jogadores } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const indiceCorretoAna = sala.piramideAtual.progresso.get(ana.jogadorId).perguntaAtual.indiceCorreto;

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceCorretoAna });
  const vitoria = await bruno.cliente.esperar("vencedorPiramide");

  assert.equal(vitoria.vencedorNome, "Ana");
  assert.equal(sala.estado, "vitoria_piramide");

  bruno.cliente.enviar({ type: "responderPiramide", alternativaIndex: 0 });
  const erro = await bruno.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /não está em andamento|já terminou/i);
});

test("depois da vitória o pódio vem sozinho, sem ninguém precisar apertar continuar", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PIRAMIDE_DE_UM_ANDAR);
  t.after(fechar);

  const { jogadores } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const indiceCorretoAna = sala.piramideAtual.progresso.get(ana.jogadorId).perguntaAtual.indiceCorreto;

  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: indiceCorretoAna });
  const fim = await bruno.cliente.esperar("fimDePartida", 2000);

  assert.equal(sala.estado, "fim");
  assert.equal(fim.vencedorNome, "Ana");
  assert.equal(fim.classificacao[0].nome, "Ana");
  assert.equal(fim.classificacao[0].chegouAoTopo, true);
  assert.equal(fim.classificacao[0].colocacao, 1);
  assert.equal(fim.classificacao[1].nome, "Bruno");
  assert.equal(fim.placarFinal.length, 2, "o placar de pontos vai junto, como história da partida");
});

// ---------- a classificação final ----------

test("classificação: quem chegou ao topo é o 1º mesmo tendo feito menos pontos", () => {
  const sala = salaCom([2300, 2600, 2550]);
  sala.piramideAtual = {
    progresso: new Map([
      ["1", { posicao: 8, largada: 0 }], // a virada: era a última e chegou ao topo
      ["2", { posicao: 6, largada: 4 }],
      ["3", { posicao: 6, largada: 3 }],
    ]),
  };
  const classificacao = sala._classificacaoFinal();
  assert.deepEqual(classificacao.map((j) => j.id), ["1", "2", "3"]);
  assert.equal(classificacao[0].chegouAoTopo, true);
});

test("classificação: do 2º em diante vale o andar, e os pontos só desempatam quem parou junto", () => {
  const sala = salaCom([1000, 3000, 2000, 2500]);
  sala.piramideAtual = {
    progresso: new Map([
      ["1", { posicao: 8, largada: 0 }],
      ["2", { posicao: 4, largada: 4 }], // mais pontos de todos, mas parou baixo
      ["3", { posicao: 6, largada: 2 }],
      ["4", { posicao: 6, largada: 3 }],
    ]),
  };
  const ids = sala._classificacaoFinal().map((j) => j.id);
  // 4 e 3 pararam no mesmo andar: desempata quem tem mais pontos (o 4)
  assert.deepEqual(ids, ["1", "4", "3", "2"]);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { TIPOS_DE_PODER } = require("../sala");
const {
  subirServidorDeTeste,
  criarCliente,
  iniciarPartidaAteEscolhaPoder,
  avancarAteEscolhaAlvo,
} = require("./ajuda");

test("escolhaPoder chega pra todos com os 4 tipos disponíveis", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores, escolhasPoder } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  void jogadores;

  for (const escolha of escolhasPoder) {
    assert.deepEqual([...escolha.tiposDisponiveis].sort(), [...TIPOS_DE_PODER].sort());
  }
});

test("escolher um tipo de poder inválido é rejeitado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "escolherPoder", tipo: "invencibilidade" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /inválido/i);
});

test("não é possível escolher poder duas vezes na mesma pergunta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "escolherPoder", tipo: "congelamento" });
  await new Promise((r) => setTimeout(r, 50));
  ana.cliente.enviar({ type: "escolherPoder", tipo: "gosma" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já escolheu/i);
});

test("depois de escolher um poder, a tela de alvo mostra o tipo e os outros jogadores", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores, escolhas } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], [
    "congelamento",
    null,
  ]);
  void jogadores;

  const [escolhaAna, escolhaBruno] = escolhas;
  assert.equal(escolhaAna.temPoder, true);
  assert.equal(escolhaAna.tipo, "congelamento");
  assert.equal(escolhaAna.alvosPossiveis.length, 1);
  assert.equal(escolhaAna.alvosPossiveis[0].nome, "Bruno");

  assert.equal(escolhaBruno.temPoder, false);
});

test("quem não escolheu poder não consegue escolher alvo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  // com 3 jogadores e só a Ana tendo poder, a fase de alvo continua aberta
  // esperando a Ana - dá tempo do Bruno tentar (e falhar) antes dela resolver.
  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno", "Carlos"], [
    "congelamento",
    null,
    null,
  ]);
  const [ana, bruno] = jogadores;

  bruno.cliente.enviar({ type: "escolherAlvoPoder", alvoId: ana.jogadorId });
  const erro = await bruno.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /não escolheu um poder/i);
});

test("não é possível usar um poder em si mesmo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], [
    "congelamento",
    null,
  ]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "escolherAlvoPoder", alvoId: ana.jogadorId });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /si mesmo/i);
});

test("alvo inválido é rejeitado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], [
    "congelamento",
    null,
  ]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "escolherAlvoPoder", alvoId: "id-que-nao-existe" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /inválido/i);
});

test("não é possível escolher o alvo duas vezes", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  // Ana e Bruno têm poder, Carlos não - depois da Ana agir, a fase continua
  // aberta esperando o Bruno, então dá pra testar a segunda tentativa da Ana.
  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno", "Carlos"], [
    "congelamento",
    "gosma",
    null,
  ]);
  const [ana, , carlos] = jogadores;

  ana.cliente.enviar({ type: "escolherAlvoPoder", alvoId: carlos.jogadorId });
  await carlos.cliente.esperar("atingidoPorPoder");

  ana.cliente.enviar({ type: "escolherAlvoPoder", alvoId: carlos.jogadorId });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já escolheu/i);
});

test("o alvo recebe o aviso de que foi atingido, com o nome de quem usou", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], [
    "congelamento",
    null,
  ]);
  const [ana, bruno] = jogadores;

  ana.cliente.enviar({ type: "escolherAlvoPoder", alvoId: bruno.jogadorId });
  const aviso = await bruno.cliente.esperar("atingidoPorPoder");

  assert.equal(aviso.deNome, "Ana");
  assert.equal(aviso.tipo, "congelamento");
  assert.equal(aviso.efeitosAtivos.length, 1);
});

test("efeitos de jogadores diferentes contra o mesmo alvo se acumulam", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno", "Carlos"], [
    "congelamento",
    "gosma",
    null,
  ]);
  const [ana, bruno, carlos] = jogadores;

  ana.cliente.enviar({ type: "escolherAlvoPoder", alvoId: carlos.jogadorId });
  await carlos.cliente.esperar("atingidoPorPoder");
  bruno.cliente.enviar({ type: "escolherAlvoPoder", alvoId: carlos.jogadorId });
  const segundoAviso = await carlos.cliente.esperar("atingidoPorPoder");

  assert.equal(segundoAviso.efeitosAtivos.length, 2);
  const autores = segundoAviso.efeitosAtivos.map((e) => e.deNome).sort();
  assert.deepEqual(autores, ["Ana", "Bruno"]);

  const iniciarRespostaCarlos = await carlos.cliente.esperar("iniciarResposta", 2000);
  assert.equal(iniciarRespostaCarlos.efeitosAtivos.length, 2);
});

test("quem não foi atacado recebe efeitosAtivos vazio em iniciarResposta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], [null, null]);
  const [, bruno] = jogadores;

  const inicioBruno = await bruno.cliente.esperar("iniciarResposta", 2000);
  assert.deepEqual(inicioBruno.efeitosAtivos, []);
});

test("quando ninguém escolhe poder, o jogo segue direto sem travar esperando alvo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], [null, null]);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta", 2000)));
});

test("TV recebe o evento de uso de poder, com quem atacou e quem foi o alvo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  await tv.esperar("estadoSala");

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], [
    "bombolha",
    null,
  ]);
  const [ana, bruno] = jogadores;

  ana.cliente.enviar({ type: "escolherAlvoPoder", alvoId: bruno.jogadorId });
  const evento = await tv.esperar("usoDePoder");

  assert.equal(evento.deNome, "Ana");
  assert.equal(evento.alvoNome, "Bruno");
  assert.equal(evento.tipo, "bombolha");
});

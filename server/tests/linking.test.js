const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidorDeTeste, avancarAteLinking } = require("./ajuda");

test("Linking chega com colunas do mesmo tamanho e um tema definido", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno"]);
  void jogadores;

  assert.ok(sala.linkingAtual.tema);
  assert.ok(sala.linkingAtual.pares.length >= 3);
});

test("cada jogador recebe seu próprio embaralhamento da coluna da direita", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno", "Carlos", "Diego"]);
  void jogadores;

  const embaralhamentos = [...sala.linkingAtual.progresso.values()].map((p) =>
    p.direitaEmbaralhadaIndices.join(",")
  );
  // não é garantido matematicamente que todos sejam diferentes, mas com 4
  // jogadores e pelo menos alguns pares, a chance de todos saírem iguais é
  // desprezível - se esse teste falhar de vez em quando, é sinal de que o
  // embaralhamento não está mesmo sendo feito por jogador.
  assert.ok(new Set(embaralhamentos).size > 1, "esperava embaralhamentos diferentes entre os jogadores");
});

test("ligar o par certo é aceito e pontua; ligar errado não conta ponto", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;
  const progressoAna = sala.linkingAtual.progresso.get(ana.jogadorId);

  const direitaIndexCorreto = progressoAna.direitaEmbaralhadaIndices.indexOf(0);
  const direitaIndexErrado = progressoAna.direitaEmbaralhadaIndices.findIndex((i) => i !== 0);

  ana.cliente.enviar({ type: "tentarPar", esquerdaIndex: 0, direitaIndex: direitaIndexErrado });
  const respostaErrada = await ana.cliente.esperar("resultadoTentativaPar");
  assert.equal(respostaErrada.correto, false);

  ana.cliente.enviar({ type: "tentarPar", esquerdaIndex: 0, direitaIndex: direitaIndexCorreto });
  const respostaCerta = await ana.cliente.esperar("resultadoTentativaPar");
  assert.equal(respostaCerta.correto, true);
});

test("não é possível ligar de novo um par que já foi acertado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;
  const progressoAna = sala.linkingAtual.progresso.get(ana.jogadorId);
  const direitaIndex = progressoAna.direitaEmbaralhadaIndices.indexOf(0);

  ana.cliente.enviar({ type: "tentarPar", esquerdaIndex: 0, direitaIndex });
  await ana.cliente.esperar("resultadoTentativaPar");

  ana.cliente.enviar({ type: "tentarPar", esquerdaIndex: 0, direitaIndex });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já foi ligado/i);
});

test("não é possível usar a mesma opção da direita em dois pares diferentes", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;
  const progressoAna = sala.linkingAtual.progresso.get(ana.jogadorId);
  const direitaIndex = progressoAna.direitaEmbaralhadaIndices.indexOf(0);

  ana.cliente.enviar({ type: "tentarPar", esquerdaIndex: 0, direitaIndex });
  await ana.cliente.esperar("resultadoTentativaPar");

  // tenta usar a mesma opção da direita (já usada) num item da esquerda diferente
  ana.cliente.enviar({ type: "tentarPar", esquerdaIndex: 1, direitaIndex });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já foi usada/i);
});

test("quem completa todos os pares ganha mais pontos que quem completa só parte", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const totalPares = sala.linkingAtual.pares.length;
  const progressoAna = sala.linkingAtual.progresso.get(ana.jogadorId);
  const progressoBruno = sala.linkingAtual.progresso.get(bruno.jogadorId);

  // Ana acerta todos os pares
  for (let esquerdaIndex = 0; esquerdaIndex < totalPares; esquerdaIndex++) {
    const direitaIndex = progressoAna.direitaEmbaralhadaIndices.indexOf(esquerdaIndex);
    ana.cliente.enviar({ type: "tentarPar", esquerdaIndex, direitaIndex });
  }
  // Bruno acerta só o primeiro e nunca completa - a revelação só vem
  // quando o tempo (bem curto, na config de teste) se esgota.
  const direitaIndex0 = progressoBruno.direitaEmbaralhadaIndices.indexOf(0);
  bruno.cliente.enviar({ type: "tentarPar", esquerdaIndex: 0, direitaIndex: direitaIndex0 });

  const resultadoAna = await ana.cliente.esperar("resultadoLinking", 2000);
  const resultadoBruno = await bruno.cliente.esperar("resultadoLinking", 2000);

  assert.equal(resultadoAna.paresCorretos, totalPares);
  assert.equal(resultadoBruno.paresCorretos, 1);
  assert.ok(resultadoAna.pontosGanhos > resultadoBruno.pontosGanhos);
  assert.equal(resultadoAna.pares.length, totalPares);
});

test("quando todos completam antes do tempo, revela na hora (sem esperar o timeout)", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ tempoLimiteLinkingMs: 60000 });
  t.after(fechar);

  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const totalPares = sala.linkingAtual.pares.length;

  for (const j of jogadores) {
    const progresso = sala.linkingAtual.progresso.get(j.jogadorId);
    for (let esquerdaIndex = 0; esquerdaIndex < totalPares; esquerdaIndex++) {
      const direitaIndex = progresso.direitaEmbaralhadaIndices.indexOf(esquerdaIndex);
      j.cliente.enviar({ type: "tentarPar", esquerdaIndex, direitaIndex });
    }
  }
  void bruno;

  // se dependesse do timeout de 60s, isso estouraria o timeout de 1500ms do teste
  const resultadoAna = await ana.cliente.esperar("resultadoLinking", 1500);
  assert.equal(resultadoAna.paresCorretos, totalPares);
});

test("depois do resultado, precisa de todos confirmarem 'continuar' pra ir pro Sorting", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  const totalPares = sala.linkingAtual.pares.length;

  for (const j of jogadores) {
    const progresso = sala.linkingAtual.progresso.get(j.jogadorId);
    for (let esquerdaIndex = 0; esquerdaIndex < totalPares; esquerdaIndex++) {
      const direitaIndex = progresso.direitaEmbaralhadaIndices.indexOf(esquerdaIndex);
      j.cliente.enviar({ type: "tentarPar", esquerdaIndex, direitaIndex });
    }
  }
  await Promise.all([ana.cliente.esperar("resultadoLinking"), bruno.cliente.esperar("resultadoLinking")]);

  ana.cliente.enviar({ type: "continuar" });
  await assert.rejects(() => ana.cliente.esperar("iniciarSorting", 150));

  bruno.cliente.enviar({ type: "continuar" });
  await ana.cliente.esperar("iniciarSorting", 2000);
});

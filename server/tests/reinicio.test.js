const test = require("node:test");
const assert = require("node:assert/strict");
const {
  subirServidorDeTeste,
  criarCliente,
  entrarNaSala,
  pularEscolhaDePoder,
} = require("./ajuda");

const FASES_LONGAS = {
  tempoLimitePerguntaMs: 6000,
  totalRodadas: 1,
  perguntasPorRodada: 1,
};

// prazo de reconexão curto: a partida só é encerrada quando ele passa sem
// ninguém voltar (nos testes, 300ms em vez dos 60s de verdade)
const PRAZO_CURTO = { ...FASES_LONGAS, tempoReconexaoMs: 300 };

async function ateJanelaDeResposta(porta, sala, nomes) {
  const jogadores = [];
  for (const nome of nomes) jogadores.push(await entrarNaSala(porta, nome, sala.codigo));
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPorta")));
  for (const j of jogadores) j.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("portaEscolhida")));
  await pularEscolhaDePoder(jogadores);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta")));
  return jogadores;
}

// joga a partida inteira (1 rodada, 1 pergunta, Linking, Sorting e Pirâmide)
// até a tela de fim de partida
async function ateFimDePartida(porta, sala, nomes) {
  const jogadores = await ateJanelaDeResposta(porta, sala, nomes);
  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  for (const j of jogadores) j.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPergunta")));
  for (const j of jogadores) j.cliente.enviar({ type: "continuar" });

  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarLinking")));
  const totalPares = sala.linkingAtual.pares.length;
  for (const j of jogadores) {
    const p = sala.linkingAtual.progresso.get(j.jogadorId);
    for (let i = 0; i < totalPares; i++) {
      j.cliente.enviar({ type: "tentarPar", esquerdaIndex: i, direitaIndex: p.direitaEmbaralhadaIndices.indexOf(i) });
    }
  }
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoLinking")));
  for (const j of jogadores) j.cliente.enviar({ type: "continuar" });

  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarSorting")));
  for (const j of jogadores) {
    const p = sala.sortingAtual.progresso.get(j.jogadorId);
    for (let i = 0; i < p.itens.length; i++) {
      j.cliente.enviar({ type: "classificarItem", itemIndex: i, categoria: p.gabarito[i] });
    }
  }
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoSorting")));
  for (const j of jogadores) j.cliente.enviar({ type: "continuar" });

  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarPiramide")));
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPerguntaPiramide")));
  const vencedor = jogadores[0];
  const passos = sala.cfg.piramideDegraus - sala.piramideAtual.progresso.get(vencedor.jogadorId).posicao;
  for (let i = 0; i < passos; i++) {
    const p = sala.piramideAtual.progresso.get(vencedor.jogadorId);
    vencedor.cliente.enviar({ type: "responderPiramide", alternativaIndex: p.perguntaAtual.indiceCorreto });
    if (i < passos - 1) await vencedor.cliente.esperar("novaPerguntaPiramide");
  }
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPiramide", 3000)));
  for (const j of jogadores) j.cliente.enviar({ type: "continuar" });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("fimDePartida", 3000)));
  return jogadores;
}

// ---------- sobrou um jogador só ----------

test("com 2 jogadores, se um cai e NÃO volta no prazo, a partida acaba e volta pro lobby", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PRAZO_CURTO);
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno"]);

  bruno.cliente.fechar();
  // enquanto o prazo de reconexão não acaba, a partida continua de pé
  await assert.rejects(() => ana.cliente.esperar("voltouAoLobby", 150), "não pode encerrar antes do prazo");
  assert.equal(sala.estado, "pergunta");

  const volta = await ana.cliente.esperar("voltouAoLobby", 2000);
  assert.match(volta.motivo, /não voltaram/i);
  assert.equal(sala.estado, "lobby");
  assert.equal(volta.jogadores.length, 1, "quem caiu não fica no novo lobby");
  assert.equal(volta.jogadores[0].nome, "Ana");
  void ana;
});

test("com 3 jogadores, sair um não encerra: só quando fica um", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PRAZO_CURTO);
  t.after(fechar);
  const [ana, bruno, carla] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  carla.cliente.fechar();
  await assert.rejects(() => ana.cliente.esperar("voltouAoLobby", 600), "com 2 ainda dá pra jogar");
  assert.equal(sala.estado, "pergunta");

  bruno.cliente.fechar();
  const volta = await ana.cliente.esperar("voltouAoLobby", 2000);
  assert.equal(sala.estado, "lobby");
  assert.equal(volta.jogadores.length, 1);
});

test("ao voltar pro lobby, pontos e poder da porta são zerados e o animal é mantido", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PRAZO_CURTO);
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno"]);
  sala.jogadores.get(ana.jogadorId).pontos = 777;
  sala.jogadoresQueUsaramPoderPorta.add(ana.jogadorId);

  bruno.cliente.fechar();
  const volta = await ana.cliente.esperar("voltouAoLobby", 2000);

  const euNoLobby = volta.jogadores[0];
  assert.equal(euNoLobby.pontos, 0, "os pontos têm que zerar");
  assert.equal(euNoLobby.animalId, "raposa", "o animal escolhido continua");
  assert.equal(sala.jogadoresQueUsaramPoderPorta.size, 0, "todo mundo recupera o poder da porta");
  assert.equal(sala.rodadaAtual, 0);
  assert.equal(sala.perguntaAtual, null);
  assert.deepEqual(sala.idsPerguntasUsadas, []);
});

test("depois de voltar pro lobby dá pra jogar outra partida", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PRAZO_CURTO);
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno"]);

  bruno.cliente.fechar();
  await ana.cliente.esperar("voltouAoLobby", 2000);

  // alguém novo entra (a sala voltou a aceitar entrada) e a partida recomeça
  const diego = await entrarNaSala(porta, "Diego", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });
  const [novaAna, novaDiego] = await Promise.all([
    ana.cliente.esperar("escolhaPorta", 2000),
    diego.cliente.esperar("escolhaPorta", 2000),
  ]);
  assert.equal(novaAna.rodadaAtual, 1);
  assert.equal(novaAna.poderPortaDisponivel, true, "o poder da porta voltou pra Ana");
  assert.equal(novaDiego.poderPortaDisponivel, true);
});

test("quem cai no lobby (sem partida) não dispara encerramento", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);

  bruno.cliente.fechar();
  await assert.rejects(() => ana.cliente.esperar("voltouAoLobby", 400));
  assert.equal(sala.estado, "lobby");
});

// ---------- botão do anfitrião no fim da partida ----------

test("no fim da partida, o anfitrião leva todo mundo de volta ao início", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  await tv.esperar("estadoSala");

  const [ana, bruno] = await ateFimDePartida(porta, sala, ["Ana", "Bruno"]);
  assert.equal(sala.estado, "fim");

  ana.cliente.enviar({ type: "voltarAoLobby" });
  const [voltaAna, voltaBruno, voltaTv] = await Promise.all([
    ana.cliente.esperar("voltouAoLobby", 2000),
    bruno.cliente.esperar("voltouAoLobby", 2000),
    tv.esperar("voltouAoLobby", 2000),
  ]);

  assert.equal(sala.estado, "lobby");
  assert.equal(voltaAna.motivo, null, "voltou por escolha do anfitrião, sem aviso de encerramento");
  assert.equal(voltaBruno.jogadores.length, 2, "os dois continuam na sala");
  assert.equal(voltaTv.jogadores.length, 2);
  assert.ok(voltaAna.jogadores.every((j) => j.pontos === 0));
  assert.ok(voltaAna.jogadores.every((j) => j.animalId), "os animais são mantidos");
});

test("quem não é anfitrião não consegue voltar ao início", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [, bruno] = await ateFimDePartida(porta, sala, ["Ana", "Bruno"]);

  bruno.cliente.enviar({ type: "voltarAoLobby" });
  const erro = await bruno.cliente.esperar("erroAcao", 1500);
  assert.match(erro.mensagem, /anfitrião/i);
  assert.equal(sala.estado, "fim");
});

test("não dá pra voltar ao início no meio da partida", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  ana.cliente.enviar({ type: "voltarAoLobby" });
  const erro = await ana.cliente.esperar("erroAcao", 1500);
  assert.match(erro.mensagem, /andamento/i);
  assert.equal(sala.estado, "pergunta");
});

test("depois do fim, dá pra jogar outra partida inteira", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno] = await ateFimDePartida(porta, sala, ["Ana", "Bruno"]);

  ana.cliente.enviar({ type: "voltarAoLobby" });
  await Promise.all([
    ana.cliente.esperar("voltouAoLobby", 2000),
    bruno.cliente.esperar("voltouAoLobby", 2000),
  ]);

  ana.cliente.enviar({ type: "iniciarPartida" });
  const nova = await ana.cliente.esperar("escolhaPorta", 2000);
  assert.equal(nova.rodadaAtual, 1);
  assert.equal(sala.estado, "escolha_porta");
});

test("se o anfitrião sair, outro jogador assume ao voltar pro lobby", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PRAZO_CURTO);
  t.after(fechar);
  const [ana, bruno, carla] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);
  assert.equal(sala.jogadores.get(ana.jogadorId).ehAnfitriao, true);

  ana.cliente.fechar(); // o anfitrião cai
  await assert.rejects(() => bruno.cliente.esperar("voltouAoLobby", 150));
  carla.cliente.fechar(); // agora sobrou só o Bruno

  const volta = await bruno.cliente.esperar("voltouAoLobby", 2000);
  assert.equal(volta.jogadores.length, 1);
  assert.equal(volta.jogadores[0].nome, "Bruno");
  assert.equal(volta.jogadores[0].ehAnfitriao, true, "o Bruno tem que virar anfitrião");
});

test("se o jogador voltar dentro do prazo, a partida continua (não encerra)", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, tempoReconexaoMs: 600 });
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno"]);

  bruno.cliente.fechar();
  await new Promise((r) => setTimeout(r, 120));

  // volta antes do prazo acabar
  const novo = criarCliente(porta);
  await novo.aberto();
  novo.enviar({ type: "reconectar", token: bruno.token, codigoSala: sala.codigo });
  await novo.esperar("reconectado", 1500);

  // passa bem do prazo: a partida tem que continuar de pé
  await assert.rejects(() => ana.cliente.esperar("voltouAoLobby", 1200), "ninguém ficou faltando, não pode encerrar");
  assert.equal(sala.estado, "pergunta");
  assert.equal(sala.jogadores.size, 2);
});

test("se todo mundo cai e ninguém volta, a partida é encerrada", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, tempoReconexaoMs: 250 });
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno"]);

  ana.cliente.fechar();
  bruno.cliente.fechar();

  const limite = Date.now() + 3000;
  while (sala.estado !== "lobby" && Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 30));
  }
  assert.equal(sala.estado, "lobby");
  assert.equal(sala.jogadores.size, 0, "a sala fica vazia, pronta pra uma nova entrada");
});

// ---------- reinício manual (5 toques na pílula + confirmação) ----------

test("o anfitrião reinicia o jogo no meio da partida", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno, carla] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);
  sala.jogadores.get(bruno.jogadorId).pontos = 500;

  ana.cliente.enviar({ type: "reiniciarPartida" });

  const [voltaAna, voltaBruno, voltaCarla] = await Promise.all([
    ana.cliente.esperar("voltouAoLobby", 2000),
    bruno.cliente.esperar("voltouAoLobby", 2000),
    carla.cliente.esperar("voltouAoLobby", 2000),
  ]);
  assert.equal(sala.estado, "lobby");
  assert.match(voltaAna.motivo, /reiniciou/i);
  assert.equal(voltaBruno.jogadores.length, 3, "ninguém é expulso no reinício");
  assert.ok(voltaCarla.jogadores.every((j) => j.pontos === 0), "os pontos zeram");
  assert.ok(voltaCarla.jogadores.every((j) => j.animalId), "os animais continuam");
  assert.equal(sala.perguntaAtual, null);
});

test("quem não é anfitrião não consegue reiniciar", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  bruno.cliente.enviar({ type: "reiniciarPartida" });
  const erro = await bruno.cliente.esperar("erroAcao", 1500);
  assert.match(erro.mensagem, /anfitrião/i);
  assert.equal(sala.estado, "pergunta");
});

test("depois do reinício manual dá pra começar outra partida na hora", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  ana.cliente.enviar({ type: "reiniciarPartida" });
  await Promise.all([
    ana.cliente.esperar("voltouAoLobby", 2000),
    bruno.cliente.esperar("voltouAoLobby", 2000),
  ]);

  ana.cliente.enviar({ type: "iniciarPartida" });
  const nova = await ana.cliente.esperar("escolhaPorta", 2000);
  assert.equal(nova.rodadaAtual, 1);
  assert.equal(nova.poderPortaDisponivel, true);
});

test("reiniciar no lobby não quebra nada (e não manda aviso de partida encerrada)", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);

  ana.cliente.enviar({ type: "reiniciarPartida" });
  const volta = await bruno.cliente.esperar("voltouAoLobby", 1500);
  assert.equal(volta.motivo, null);
  assert.equal(sala.estado, "lobby");
  assert.equal(sala.jogadores.size, 2);
});

test("o anfitrião também reinicia na tela de fim de partida", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno] = await ateFimDePartida(porta, sala, ["Ana", "Bruno"]);

  ana.cliente.enviar({ type: "reiniciarPartida" });
  await Promise.all([
    ana.cliente.esperar("voltouAoLobby", 2000),
    bruno.cliente.esperar("voltouAoLobby", 2000),
  ]);
  assert.equal(sala.estado, "lobby");
});

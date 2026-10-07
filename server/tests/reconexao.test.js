const test = require("node:test");
const assert = require("node:assert/strict");
const {
  subirServidorDeTeste,
  criarCliente,
  entrarNaSala,
  pularEscolhaDePoder,
  avancarAteLinking,
  avancarAteSorting,
  avancarAtePiramide,
} = require("./ajuda");
const { Sala } = require("../sala");

// opções que deixam as fases longas o bastante pra dar tempo de derrubar e
// reconectar um jogador no meio sem a fase acabar sozinha
const FASES_LONGAS = {
  tempoLimitePerguntaMs: 6000,
  tempoLimiteLinkingMs: 6000,
  tempoLimiteSortingMs: 6000,
};
const PARTIDA_CURTA = { totalRodadas: 1, perguntasPorRodada: 1 };

// ---------- utilitários ----------

async function reconectar(porta, sala, token) {
  const cliente = criarCliente(porta);
  await cliente.aberto();
  cliente.enviar({ type: "reconectar", token, codigoSala: sala.codigo });
  return cliente;
}

async function esperarLista(cliente, condicao, timeoutMs = 2000) {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    const msg = await cliente.esperar("jogadoresAtualizados", Math.max(50, limite - Date.now()));
    if (condicao(msg.jogadores)) return msg.jogadores;
  }
  throw new Error("a lista de jogadores nunca ficou como esperado");
}

// espera (por polling) até o servidor registrar algo - usado quando não há
// mensagem pro jogador avisando (ex: "o servidor recebeu minha resposta")
async function esperarCondicao(condicao, timeoutMs = 1500) {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    if (condicao()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("a condição nunca ficou verdadeira");
}

// entra com os jogadores, inicia, escolhe a primeira porta e chega na janela de resposta
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

// vai até a tela de resultado da primeira pergunta (todos responderam)
async function ateResultado(porta, sala, nomes) {
  const jogadores = await ateJanelaDeResposta(porta, sala, nomes);
  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  for (const j of jogadores) j.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPergunta")));
  return jogadores;
}

// ---------- token e reconexão básica ----------

test("ao entrar, o jogador recebe um token secreto", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);

  assert.match(ana.token, /^[0-9a-f]{32}$/);
  assert.notEqual(ana.token, bruno.token);
});

test("reconectar com token inexistente é recusado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);
  await entrarNaSala(porta, "Ana", sala.codigo);

  const cliente = await reconectar(porta, sala, "token-que-nao-existe");
  const erro = await cliente.esperar("erroReconexao");
  assert.match(erro.mensagem, /expirou/i);
});

test("reconectar com o código de sala errado é recusado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);
  const ana = await entrarNaSala(porta, "Ana", sala.codigo);

  const cliente = criarCliente(porta);
  await cliente.aberto();
  cliente.enviar({ type: "reconectar", token: ana.token, codigoSala: "ZZZZ" });
  const erro = await cliente.esperar("erroReconexao");
  assert.match(erro.mensagem, /inválido/i);
});

test("no lobby, quem cai sai na hora e o token deixa de valer", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);
  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);

  bruno.cliente.fechar();
  await esperarLista(ana.cliente, (lista) => lista.length === 1);

  const cliente = await reconectar(porta, sala, bruno.token);
  const erro = await cliente.esperar("erroReconexao");
  assert.match(erro.mensagem, /expirou/i);
});

// ---------- queda no meio da partida ----------

test("na partida, quem cai continua na sala como desconectado, com pontos e animal", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno, carla] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);
  sala.jogadores.get(bruno.jogadorId).pontos = 123;

  bruno.cliente.fechar();
  const lista = await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Bruno" && j.conectado === false));

  assert.equal(lista.length, 3, "Bruno não pode ter sido removido");
  const noServidor = sala.jogadores.get(bruno.jogadorId);
  assert.equal(noServidor.pontos, 123);
  assert.ok(noServidor.animalId);
  assert.equal(noServidor.conectado, false);
  void carla;
});

test("volta com o token: mesmo jogador, mesmos pontos e animal, e recebe a pergunta com a resposta que já deu", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);
  const pergunta = sala.perguntaAtual;
  sala.jogadores.get(bruno.jogadorId).pontos = 123;

  bruno.cliente.enviar({ type: "responder", alternativaIndex: 2 });
  await esperarCondicao(() => sala.perguntaAtual.respostas.has(bruno.jogadorId));
  bruno.cliente.fechar();
  await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Bruno" && !j.conectado));

  const novo = await reconectar(porta, sala, bruno.token);
  const boasVindas = await novo.esperar("reconectado");
  const novaPergunta = await novo.esperar("novaPergunta");
  const iniciarResposta = await novo.esperar("iniciarResposta");

  assert.equal(boasVindas.jogadorId, bruno.jogadorId);
  assert.equal(boasVindas.estado, "pergunta");
  const eleMesmo = boasVindas.jogadores.find((j) => j.id === bruno.jogadorId);
  assert.equal(eleMesmo.pontos, 123);
  assert.equal(eleMesmo.animalId, "panda");
  assert.equal(eleMesmo.conectado, true);
  assert.equal(novaPergunta.pergunta, pergunta.pergunta);
  assert.deepEqual(novaPergunta.alternativas, pergunta.alternativas);
  assert.equal(iniciarResposta.respostaDada, 2, "tem que lembrar a resposta que ele já tinha dado");
  assert.ok(iniciarResposta.tempoLimiteMs > 0 && iniciarResposta.tempoLimiteMs <= FASES_LONGAS.tempoLimitePerguntaMs);
  assert.equal(sala.jogadores.get(bruno.jogadorId).conectado, true);
});

test("quem volta sem ter respondido ainda pode responder normalmente", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno, carla] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  bruno.cliente.fechar();
  await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Bruno" && !j.conectado));
  const novo = await reconectar(porta, sala, bruno.token);
  await novo.esperar("reconectado");
  const iniciarResposta = await novo.esperar("iniciarResposta");
  assert.equal(iniciarResposta.respostaDada, null);

  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  novo.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  ana.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  carla.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  const resultado = await novo.esperar("resultadoPergunta", 2000);
  assert.equal(resultado.seuResultado.acertou, true);
});

test("jogador caído não trava a pergunta: revela assim que todos os conectados respondem", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno, carla] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  carla.cliente.fechar();
  await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Carla" && !j.conectado));

  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  ana.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  bruno.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });

  // o limite da pergunta é de 6s: se chegar bem antes, não ficou esperando a Carla
  const resultado = await ana.cliente.esperar("resultadoPergunta", 1500);
  assert.equal(resultado.seuResultado.acertou, true);
  const placarCarla = resultado.placar.find((j) => j.nome === "Carla");
  assert.equal(placarCarla.pontos, 0, "a Carla continua no placar, só sem pontuar essa pergunta");
});

// ---------- regra: só avança quando todo mundo apertar "continuar" ----------

test("com todos conectados, só avança depois que TODOS apertam continuar", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno, carla] = await ateResultado(porta, sala, ["Ana", "Bruno", "Carla"]);

  ana.cliente.enviar({ type: "continuar" });
  bruno.cliente.enviar({ type: "continuar" });
  await assert.rejects(() => ana.cliente.esperar("escolhaPoder", 300), "faltando a Carla não pode avançar");

  carla.cliente.enviar({ type: "continuar" });
  const proxima = await ana.cliente.esperar("escolhaPoder", 2000);
  assert.equal(proxima.perguntaNaRodada, 2);
});

test("quem caiu não segura o 'continuar': avança quando todos os conectados apertam", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno, carla] = await ateResultado(porta, sala, ["Ana", "Bruno", "Carla"]);

  carla.cliente.fechar();
  await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Carla" && !j.conectado));

  ana.cliente.enviar({ type: "continuar" });
  await assert.rejects(
    () => ana.cliente.esperar("escolhaPoder", 300),
    "o Bruno ainda está conectado e não apertou: não pode avançar"
  );
  bruno.cliente.enviar({ type: "continuar" });
  const proxima = await ana.cliente.esperar("escolhaPoder", 2000);
  assert.equal(proxima.perguntaNaRodada, 2);
});

test("se o último conectado que faltava apertar é quem cai, o jogo avança", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno, carla] = await ateResultado(porta, sala, ["Ana", "Bruno", "Carla"]);

  ana.cliente.enviar({ type: "continuar" });
  bruno.cliente.enviar({ type: "continuar" });
  await assert.rejects(() => ana.cliente.esperar("escolhaPoder", 250));
  carla.cliente.fechar();

  const proxima = await ana.cliente.esperar("escolhaPoder", 2000);
  assert.equal(proxima.perguntaNaRodada, 2);
});

test("quem volta na tela de resultado recebe o resultado e lembra que já apertou continuar", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno] = await ateResultado(porta, sala, ["Ana", "Bruno", "Carla"]);

  ana.cliente.enviar({ type: "continuar" });
  await bruno.cliente.esperar("progressoContinuar");
  ana.cliente.fechar();
  await esperarLista(bruno.cliente, (l) => l.some((j) => j.nome === "Ana" && !j.conectado));

  const novo = await reconectar(porta, sala, ana.token);
  const boasVindas = await novo.esperar("reconectado");
  const resultado = await novo.esperar("resultadoPergunta");

  assert.equal(boasVindas.estado, "revelacao");
  assert.equal(resultado.jaConfirmou, true);
  assert.equal(resultado.seuResultado.acertou, true);
  assert.ok(resultado.placar.length === 3);
});

test("não existe avanço automático: sem todos apertarem 'continuar', nunca avança por tempo", async (t) => {
  // a opção antiga de avanço por tempo foi removida; mesmo passando ela, não pode valer
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, timeoutSegurancaProximaMs: 150 });
  t.after(fechar);
  const [ana] = await ateResultado(porta, sala, ["Ana", "Bruno"]);

  ana.cliente.enviar({ type: "continuar" });
  await assert.rejects(() => ana.cliente.esperar("escolhaPoder", 1200), "o Bruno não apertou: não pode avançar");
  assert.equal(sala._aguardandoConfirmacao, true);
});

test("sem nenhum jogador conectado, nada avança por confirmação", () => {
  const sala = new Sala();
  assert.equal(sala._todosAtivosEm(new Set()), false);
});

// ---------- prazo de reconexão ----------

test("passado o prazo sem voltar, o jogador é removido de vez e o token deixa de valer", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, tempoReconexaoMs: 250 });
  t.after(fechar);
  const [ana, , carla] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  carla.cliente.fechar();
  await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Carla" && !j.conectado));
  assert.equal(sala.jogadores.size, 3);

  await esperarLista(ana.cliente, (l) => l.length === 2);
  assert.equal(sala.jogadores.size, 2);

  const cliente = await reconectar(porta, sala, carla.token);
  const erro = await cliente.esperar("erroReconexao");
  assert.match(erro.mensagem, /expirou/i);
});

test("se voltar dentro do prazo, o jogador NÃO é removido quando o prazo passa", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, tempoReconexaoMs: 400 });
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  bruno.cliente.fechar();
  await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Bruno" && !j.conectado));
  const novo = await reconectar(porta, sala, bruno.token);
  await novo.esperar("reconectado");

  await new Promise((r) => setTimeout(r, 700)); // bem depois do prazo
  assert.equal(sala.jogadores.size, 3);
  assert.equal(sala.jogadores.get(bruno.jogadorId).conectado, true);
});

test("o anfitrião caído só passa o cargo quando for removido", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, tempoReconexaoMs: 300 });
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);

  ana.cliente.fechar();
  await esperarLista(bruno.cliente, (l) => l.some((j) => j.nome === "Ana" && !j.conectado));
  assert.equal(sala.jogadores.get(ana.jogadorId).ehAnfitriao, true);

  await esperarLista(bruno.cliente, (l) => l.length === 2);
  assert.equal(sala.jogadores.get(bruno.jogadorId).ehAnfitriao, true);
});

test("reconectar com a conexão antiga ainda aberta troca uma pela outra", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const [ana, bruno] = await ateJanelaDeResposta(porta, sala, ["Ana", "Bruno", "Carla"]);
  void ana;

  const antigaFechou = new Promise((resolve) => bruno.cliente.ws.once("close", resolve));
  const novo = await reconectar(porta, sala, bruno.token);
  await novo.esperar("reconectado");
  await antigaFechou;

  assert.equal(sala.jogadores.size, 3);
  assert.equal(sala.jogadores.get(bruno.jogadorId).conectado, true);
  const noServidor = sala.jogadores.get(bruno.jogadorId);
  assert.equal(noServidor.ws.readyState, 1, "a conexão guardada tem que ser a nova, aberta");
  assert.equal(noServidor.conectado, true);
});

// ---------- cada fase ----------

test("fase de porta: quem volta recebe as portas e a informação de que já votou", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, tempoLimitePortaMs: 4000 });
  t.after(fechar);
  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  await entrarNaSala(porta, "Carla", sala.codigo); // 3 jogadores: a queda de um não encerra a partida
  ana.cliente.enviar({ type: "iniciarPartida" });
  const original = await bruno.cliente.esperar("escolhaPorta");
  bruno.cliente.enviar({ type: "escolherPorta", indice: 1 });
  bruno.cliente.fechar();
  await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Bruno" && !j.conectado));

  const novo = await reconectar(porta, sala, bruno.token);
  await novo.esperar("reconectado");
  const volta = await novo.esperar("escolhaPorta");

  assert.deepEqual(volta.portas, original.portas);
  assert.equal(volta.jaEscolheu, true);
  assert.ok(volta.tempoLimiteMs <= 4000);
});

test("fase de poder: quem volta recebe a escolha de poder com o tempo que falta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, tempoEscolhaPoderMs: 4000 });
  t.after(fechar);
  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo);
  const carla = await entrarNaSala(porta, "Carla", sala.codigo); // 3: a queda de um não encerra
  ana.cliente.enviar({ type: "iniciarPartida" });
  await ana.cliente.esperar("escolhaPorta");
  await bruno.cliente.esperar("escolhaPorta");
  await carla.cliente.esperar("escolhaPorta");
  ana.cliente.enviar({ type: "escolherPorta", indice: 0 });
  bruno.cliente.enviar({ type: "escolherPorta", indice: 0 });
  carla.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await bruno.cliente.esperar("escolhaPoder");
  bruno.cliente.fechar();
  await esperarLista(ana.cliente, (l) => l.some((j) => j.nome === "Bruno" && !j.conectado));

  const novo = await reconectar(porta, sala, bruno.token);
  await novo.esperar("reconectado");
  const volta = await novo.esperar("escolhaPoder");
  assert.ok(volta.tiposDisponiveis.length > 0);
  assert.equal(volta.jaEscolheu, false);
  assert.ok(volta.tempoLimiteMs <= 4000);
});

test("Linking: quem volta mantém os pares já ligados e a própria ordem das opções", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, ...PARTIDA_CURTA });
  t.after(fechar);
  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno", "Carla"]);
  const [ana, bruno] = jogadores;

  const progresso = sala.linkingAtual.progresso.get(ana.jogadorId);
  const direitaIndex = progresso.direitaEmbaralhadaIndices.indexOf(0);
  ana.cliente.enviar({ type: "tentarPar", esquerdaIndex: 0, direitaIndex });
  const tentativa = await ana.cliente.esperar("resultadoTentativaPar");
  assert.equal(tentativa.correto, true);
  ana.cliente.fechar();
  await esperarLista(bruno.cliente, (l) => l.some((j) => j.nome === "Ana" && !j.conectado));

  const novo = await reconectar(porta, sala, ana.token);
  const boasVindas = await novo.esperar("reconectado");
  const volta = await novo.esperar("iniciarLinking");

  assert.equal(boasVindas.estado, "linking");
  assert.deepEqual(volta.corretos, [0]);
  assert.deepEqual(volta.direitaUsada, [direitaIndex]);
  assert.deepEqual(volta.direita, progresso.direita);
  assert.equal(volta.completou, false);
  assert.equal(volta.esquerda.length, sala.linkingAtual.pares.length);
});

test("Sorting: quem volta mantém os itens já classificados", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, ...PARTIDA_CURTA });
  t.after(fechar);
  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno", "Carla"]);
  const [ana, bruno] = jogadores;

  const progresso = sala.sortingAtual.progresso.get(ana.jogadorId);
  ana.cliente.enviar({ type: "classificarItem", itemIndex: 0, categoria: progresso.gabarito[0] });
  const resposta = await ana.cliente.esperar("resultadoClassificacaoItem");
  assert.equal(resposta.correto, true);
  ana.cliente.fechar();
  await esperarLista(bruno.cliente, (l) => l.some((j) => j.nome === "Ana" && !j.conectado));

  const novo = await reconectar(porta, sala, ana.token);
  await novo.esperar("reconectado");
  const volta = await novo.esperar("iniciarSorting");

  assert.deepEqual(volta.itens, progresso.itens);
  assert.deepEqual(volta.respondidos, [{ itemIndex: 0, categoria: progresso.gabarito[0], correto: true }]);
  assert.equal(volta.categoriaA, sala.sortingAtual.categoriaA);
});

test("Pirâmide: quem volta recebe a mesma pergunta, as alternativas já erradas e a posição", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, ...PARTIDA_CURTA, piramideDegraus: 6 });
  t.after(fechar);
  const { jogadores, perguntas } = await avancarAtePiramide(porta, sala, ["Ana", "Bruno", "Carla"]);
  const [ana, bruno] = jogadores;

  const atual = sala.piramideAtual.progresso.get(ana.jogadorId).perguntaAtual;
  const errada = (atual.indiceCorreto + 1) % 4;
  ana.cliente.enviar({ type: "responderPiramide", alternativaIndex: errada });
  await ana.cliente.esperar("respostaErradaPiramide");
  ana.cliente.fechar();
  await esperarLista(bruno.cliente, (l) => l.some((j) => j.nome === "Ana" && !j.conectado));

  const novo = await reconectar(porta, sala, ana.token);
  const boasVindas = await novo.esperar("reconectado");
  const inicio = await novo.esperar("iniciarPiramide");
  const pergunta = await novo.esperar("novaPerguntaPiramide");
  const jaErrada = await novo.esperar("respostaErradaPiramide");

  assert.equal(boasVindas.estado, "piramide");
  assert.equal(inicio.totalDegraus, 6);
  assert.equal(pergunta.pergunta, perguntas[0].pergunta);
  assert.deepEqual(pergunta.alternativas, perguntas[0].alternativas);
  assert.equal(jaErrada.alternativaIndex, errada);
  assert.ok(inicio.jogadores.find((j) => j.id === ana.jogadorId));
});

// ---------- TV ----------

test("TV que reconecta no meio da pergunta recebe a pergunta, o timer e quem já travou", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  const jogadores = [];
  for (const nome of ["Ana", "Bruno"]) jogadores.push(await entrarNaSala(porta, nome, sala.codigo));
  const [ana, bruno] = jogadores;
  ana.cliente.enviar({ type: "iniciarPartida" });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPorta")));
  for (const j of jogadores) j.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("portaEscolhida")));
  await pularEscolhaDePoder(jogadores);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta")));
  ana.cliente.enviar({ type: "responder", alternativaIndex: 0 });
  await esperarCondicao(() => sala.perguntaAtual.respostas.has(ana.jogadorId));
  void bruno;

  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  await tv.esperar("estadoSala");
  const nova = await tv.esperar("novaPergunta");
  const inicio = await tv.esperar("iniciarResposta");
  const progresso = await tv.esperar("progressoRespostas");

  assert.equal(nova.pergunta, sala.perguntaAtual.pergunta);
  assert.ok(inicio.tempoLimiteMs > 0 && inicio.tempoLimiteMs <= FASES_LONGAS.tempoLimitePerguntaMs);
  assert.deepEqual(progresso.jogadoresQueResponderam, [ana.jogadorId]);
});

test("TV que reconecta na tela de resultado recebe o resultado com as alternativas", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(FASES_LONGAS);
  t.after(fechar);
  await ateResultado(porta, sala, ["Ana", "Bruno"]);

  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  const resultado = await tv.esperar("resultadoPergunta");

  assert.equal(resultado.alternativas.length, 4);
  assert.equal(resultado.respostaCorretaIndex, sala.perguntaAtual.indiceCorreto);
  assert.equal(resultado.placar.length, 2);
});

test("TV que reconecta no Linking recebe o tema, o tempo e o progresso de cada jogador", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ ...FASES_LONGAS, ...PARTIDA_CURTA });
  t.after(fechar);
  await avancarAteLinking(porta, sala, ["Ana", "Bruno"]);

  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  const inicio = await tv.esperar("iniciarLinking");
  const progresso = await tv.esperar("progressoLinking");

  assert.equal(inicio.tema, sala.linkingAtual.tema);
  assert.ok(inicio.tempoLimiteMs <= FASES_LONGAS.tempoLimiteLinkingMs);
  assert.equal(progresso.jogadores.length, 2);
});

test("TV que reconecta antes de a partida começar continua só vendo o lobby", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);
  await entrarNaSala(porta, "Ana", sala.codigo);

  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  const estado = await tv.esperar("estadoSala");
  assert.equal(estado.estado, "lobby");
  await assert.rejects(() => tv.esperar("novaPergunta", 150));
});

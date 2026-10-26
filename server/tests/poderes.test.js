const test = require("node:test");
const assert = require("node:assert/strict");
const { PODERES_ATAQUE, PODERES_ESPECIAIS } = require("../sala");
const {
  subirServidorDeTeste,
  criarCliente,
  chegarNaPrimeiraPergunta,
  iniciarPartidaAteEscolhaPoder,
  avancarAteEscolhaAlvo,
  forcarOferta,
  responderPergunta,
  confirmar,
} = require("./ajuda");

async function conectarTv(porta) {
  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  await tv.esperar("estadoSala");
  return tv;
}

// Leva a partida até a escolha de poder com a TV já conectada.
async function ateEscolhaPoderComTv(porta, sala, nomes) {
  const tv = await conectarTv(porta);
  const r = await iniciarPartidaAteEscolhaPoder(porta, sala, nomes);
  return { tv, ...r };
}

// Cada jogador faz o que está em `jogadas` (mesmo índice): { tipo, alvo }
// onde `alvo` é o índice de outro jogador. tipo null = "Não usar poder".
async function usarPoderes(sala, jogadores, jogadas) {
  jogadores.forEach((j, i) => {
    const tipo = jogadas[i]?.tipo ?? null;
    if (tipo && PODERES_ESPECIAIS.includes(tipo)) forcarOferta(sala, j.jogadorId, tipo);
    j.cliente.enviar({ type: "escolherPoder", tipo });
  });
  const telasAlvo = await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaAlvo")));
  jogadores.forEach((j, i) => {
    const alvo = jogadas[i]?.alvo;
    if (alvo !== undefined && telasAlvo[i].precisaAlvo) {
      j.cliente.enviar({ type: "escolherAlvoPoder", alvoId: jogadores[alvo].jogadorId });
    }
  });
  return telasAlvo;
}

// ---------- a oferta ----------

test("a primeira pergunta do tema não tem fase de poder", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await chegarNaPrimeiraPergunta(porta, sala, ["Ana", "Bruno"]);
  assert.equal(sala.perguntaNaRodada, 1);
  assert.equal(sala.estado, "leitura");
  // a pergunta veio sem passar pela escolha de poder
  await assert.rejects(() => jogadores[0].cliente.esperar("escolhaPoder", 100));
});

test("a oferta traz sempre os 3 de ataque e um 4º sorteado entre os especiais", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { escolhasPoder } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  for (const escolha of escolhasPoder) {
    const tipos = escolha.oferta.map((o) => o.tipo);
    assert.deepEqual(tipos.slice(0, 3), PODERES_ATAQUE);
    assert.equal(tipos.length, 4);
    assert.ok(PODERES_ESPECIAIS.includes(tipos[3]));
    // os de ataque são ilimitados; o especial diz quantos usos restam
    assert.ok(escolha.oferta.slice(0, 3).every((o) => o.usos === null));
    assert.ok(escolha.oferta[3].usos > 0);
  }
});

test("sem nenhum especial disponível, aparecem só os 3 de ataque", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ usosEscudo: 0, usosAposta: 0, temasComFesta: [] });
  t.after(fechar);

  const { escolhasPoder } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  for (const escolha of escolhasPoder) {
    assert.deepEqual(escolha.oferta.map((o) => o.tipo), PODERES_ATAQUE);
  }
});

test("a Festa de Pontos só aparece nos temas dela", async (t) => {
  // o tema 1 não tem festa; só escudo e aposta zerados deixam sobrar a festa
  const { porta, sala, fechar } = await subirServidorDeTeste({ usosEscudo: 0, usosAposta: 0, temasComFesta: [1] });
  t.after(fechar);
  const { escolhasPoder } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  assert.equal(escolhasPoder[0].oferta[3].tipo, "festa");

  const outra = await subirServidorDeTeste({ usosEscudo: 0, usosAposta: 0, temasComFesta: [2] });
  t.after(outra.fechar);
  const r = await iniciarPartidaAteEscolhaPoder(outra.porta, outra.sala, ["Ana", "Bruno"]);
  assert.equal(r.escolhasPoder[0].oferta.length, 3, "fora do tema dela, a festa não é oferecida");
});

test("escolher poder que não está na própria oferta é recusado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ usosEscudo: 0, usosAposta: 0, temasComFesta: [] });
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  jogadores[0].cliente.enviar({ type: "escolherPoder", tipo: "escudo" });
  const erro = await jogadores[0].cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /não está disponível/i);
});

test("escolher um tipo de poder inválido é rejeitado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  jogadores[0].cliente.enviar({ type: "escolherPoder", tipo: "invencibilidade" });
  const erro = await jogadores[0].cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /inválido/i);
});

test("os poderes que saíram do jogo não existem mais", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  for (const tipo of ["gosma", "bombolha", "pedagio"]) {
    jogadores[0].cliente.enviar({ type: "escolherPoder", tipo });
    const erro = await jogadores[0].cliente.esperar("erroAcao");
    assert.match(erro.mensagem, /inválido/i);
  }
});

test("não é possível escolher poder duas vezes na mesma pergunta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno", "Caio"]);
  jogadores[0].cliente.enviar({ type: "escolherPoder", tipo: "congelamento" });
  await new Promise((r) => setTimeout(r, 50));
  jogadores[0].cliente.enviar({ type: "escolherPoder", tipo: "nevoa" });
  const erro = await jogadores[0].cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já escolheu/i);
});

test("'não usar poder' de todo mundo encerra a fase na hora, sem esperar o tempo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ tempoEscolhaPoderMs: 60000 });
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  for (const j of jogadores) j.cliente.enviar({ type: "escolherPoder", tipo: null });
  // com 60s de prazo, só chega a tempo se não estiver esperando o relógio
  const alvo = await jogadores[0].cliente.esperar("escolhaAlvo", 1000);
  assert.equal(alvo.temPoder, false);
  // sem poder usado, não há animação: a pergunta vem direto
  await jogadores[0].cliente.esperar("novaPergunta", 1000);
});

// ---------- a escolha de alvo ----------

test("a tela de alvo mostra os outros jogadores com animal e pontos, do líder pra baixo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores, escolhas } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno", "Caio"], [
    "congelamento", null, null,
  ]);
  const [escolhaAna, escolhaBruno] = escolhas;
  assert.equal(escolhaAna.temPoder, true);
  assert.equal(escolhaAna.precisaAlvo, true);
  assert.equal(escolhaAna.tipo, "congelamento");
  assert.deepEqual(escolhaAna.alvosPossiveis.map((a) => a.nome).sort(), ["Bruno", "Caio"]);
  for (const alvo of escolhaAna.alvosPossiveis) {
    assert.ok(alvo.avatar && alvo.avatar.emoji, "o cartão do alvo mostra o animal");
    assert.equal(typeof alvo.pontos, "number");
    assert.ok(alvo.posicao >= 1);
  }
  const pontos = escolhaAna.alvosPossiveis.map((a) => a.pontos);
  assert.deepEqual(pontos, [...pontos].sort((a, b) => b - a));
  assert.equal(escolhaBruno.temPoder, false);
  void jogadores;
});

test("Escudo e Festa não pedem alvo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { escolhas } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], ["escudo", "festa"]);
  for (const e of escolhas) {
    assert.equal(e.temPoder, true);
    assert.equal(e.precisaAlvo, false);
  }
});

test("quem não escolheu poder não consegue escolher alvo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno", "Caio"], ["congelamento", null, null]);
  jogadores[1].cliente.enviar({ type: "escolherAlvoPoder", alvoId: jogadores[0].jogadorId });
  const erro = await jogadores[1].cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /não escolheu/i);
});

test("não é possível usar um poder em si mesmo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], ["congelamento", null]);
  jogadores[0].cliente.enviar({ type: "escolherAlvoPoder", alvoId: jogadores[0].jogadorId });
  const erro = await jogadores[0].cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /si mesmo/i);
});

test("alvo inválido é rejeitado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno"], ["congelamento", null]);
  jogadores[0].cliente.enviar({ type: "escolherAlvoPoder", alvoId: "nao-existe" });
  const erro = await jogadores[0].cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /inválido/i);
});

test("não é possível escolher o alvo duas vezes", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await avancarAteEscolhaAlvo(porta, sala, ["Ana", "Bruno", "Caio"], ["congelamento", "mordicadores", null]);
  jogadores[0].cliente.enviar({ type: "escolherAlvoPoder", alvoId: jogadores[1].jogadorId });
  await new Promise((r) => setTimeout(r, 50));
  jogadores[0].cliente.enviar({ type: "escolherAlvoPoder", alvoId: jogadores[2].jogadorId });
  const erro = await jogadores[0].cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já escolheu/i);
});

// ---------- os efeitos ----------

test("efeitos de jogadores diferentes contra o mesmo alvo se acumulam", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno", "Caio"]);
  await usarPoderes(sala, jogadores, [
    { tipo: "congelamento", alvo: 2 },
    { tipo: "nevoa", alvo: 2 },
    { tipo: null },
  ]);
  const inicio = await jogadores[2].cliente.esperar("iniciarResposta");
  assert.deepEqual(inicio.efeitosAtivos.map((e) => e.tipo).sort(), ["congelamento", "nevoa"]);
  assert.deepEqual(inicio.efeitosAtivos.map((e) => e.deNome).sort(), ["Ana", "Bruno"]);
});

test("quem não foi atacado recebe efeitosAtivos vazio", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno", "Caio"]);
  await usarPoderes(sala, jogadores, [{ tipo: "mordicadores", alvo: 1 }, { tipo: null }, { tipo: null }]);
  const inicioAna = await jogadores[0].cliente.esperar("iniciarResposta");
  assert.deepEqual(inicioAna.efeitosAtivos, []);
});

test("Escudo segura os ataques: o efeito não chega, e o celular conta quantos bloqueou", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno", "Caio"]);
  await usarPoderes(sala, jogadores, [
    { tipo: "congelamento", alvo: 2 },
    { tipo: "nevoa", alvo: 2 },
    { tipo: "escudo" },
  ]);
  const inicioCaio = await jogadores[2].cliente.esperar("iniciarResposta");
  assert.deepEqual(inicioCaio.efeitosAtivos, []);
  assert.deepEqual(inicioCaio.escudo, { bloqueados: 2 });
});

test("o Escudo gasta a cota: depois de 3 ele some da oferta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ usosEscudo: 1 });
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  forcarOferta(sala, jogadores[0].jogadorId, "escudo");
  jogadores[0].cliente.enviar({ type: "escolherPoder", tipo: "escudo" });
  await jogadores[0].cliente.esperar("escolhaAlvo");
  assert.equal(sala._usos(jogadores[0].jogadorId).escudo, 0);
  assert.ok(sala._montarOferta(jogadores[0].jogadorId).every((o) => o.tipo !== "escudo"));
});

test("Aposta: quem apostou ganha +75 se o alvo acertar", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;
  await usarPoderes(sala, jogadores, [{ tipo: "aposta", alvo: 1 }, { tipo: null }]);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));

  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta")));
  const certa = sala.perguntaAtual.indiceCorreto;
  ana.cliente.enviar({ type: "responder", alternativaIndex: (certa + 1) % 4 }); // a Ana erra
  bruno.cliente.enviar({ type: "responder", alternativaIndex: certa }); // o Bruno acerta
  const resultadoAna = await ana.cliente.esperar("resultadoPergunta");

  assert.equal(resultadoAna.seuResultado.acertou, false);
  assert.equal(resultadoAna.seuResultado.aposta.ganhou, true);
  assert.equal(resultadoAna.seuResultado.aposta.alvoNome, "Bruno");
  assert.equal(resultadoAna.seuResultado.pontosGanhos, 75, "errou a pergunta mas ganhou a aposta");
});

test("Aposta: se o alvo errar não acontece nada - a aposta só acrescenta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  const pontosAntes = sala.jogadores.get(jogadores[0].jogadorId).pontos;
  await usarPoderes(sala, jogadores, [{ tipo: "aposta", alvo: 1 }, { tipo: null }]);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
  const [resultadoAna] = await responderPergunta(jogadores, sala, { acertam: false });

  assert.equal(resultadoAna.seuResultado.aposta.ganhou, false);
  assert.equal(resultadoAna.seuResultado.pontosGanhos, 0);
  assert.equal(sala.jogadores.get(jogadores[0].jogadorId).pontos, pontosAntes, "nunca tira pontos");
});

test("Aposta: o alvo não fica sabendo, e o Escudo dele não bloqueia", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { tv, jogadores } = await ateEscolhaPoderComTv(porta, sala, ["Ana", "Bruno"]);
  await usarPoderes(sala, jogadores, [{ tipo: "aposta", alvo: 1 }, { tipo: "escudo" }]);

  // a TV anuncia a aposta sem dizer em quem - o alvo está olhando para ela
  const animacao = await tv.esperar("animacaoPoderes");
  const momentoAposta = animacao.sequencia.find((m) => m.tipo === "aposta");
  assert.equal(momentoAposta.alvoId, undefined);

  const inicioBruno = await jogadores[1].cliente.esperar("iniciarResposta");
  assert.deepEqual(inicioBruno.escudo, { bloqueados: 0 }, "a aposta não conta como ataque");

  await jogadores[0].cliente.esperar("iniciarResposta");
  const certa = sala.perguntaAtual.indiceCorreto;
  for (const j of jogadores) j.cliente.enviar({ type: "responder", alternativaIndex: certa });
  const resultadoAna = await jogadores[0].cliente.esperar("resultadoPergunta");
  assert.equal(resultadoAna.seuResultado.aposta.ganhou, true, "o escudo do alvo não anula a aposta");
});

test("Festa de Pontos dobra o acerto base de todo mundo que acertou, mas não o bônus", async (t) => {
  // a festa fica no tema 1 pra dar pra testar sem jogar dois temas
  const { porta, sala, fechar } = await subirServidorDeTeste({ temasComFesta: [1], tempoLimitePerguntaMs: 60000 });
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  await usarPoderes(sala, jogadores, [{ tipo: "festa" }, { tipo: null }]);
  const pergunta = await jogadores[1].cliente.esperar("novaPergunta");
  await jogadores[0].cliente.esperar("novaPergunta");
  assert.equal(pergunta.festaAtiva, true);

  const resultados = await responderPergunta(jogadores, sala);
  for (const r of resultados) {
    assert.equal(r.festaAtiva, true);
    // base 200 + bônus de velocidade (até 100, nunca dobrado)
    assert.ok(r.seuResultado.pontosGanhos >= 200 && r.seuResultado.pontosGanhos <= 300,
      `esperava entre 200 e 300, veio ${r.seuResultado.pontosGanhos}`);
  }
});

test("a Festa é uma só por tema: depois de usada não volta a ser oferecida nele", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ temasComFesta: [1], usosEscudo: 0, usosAposta: 0 });
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  await usarPoderes(sala, jogadores, [{ tipo: "festa" }, { tipo: null }]);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
  await responderPergunta(jogadores, sala);
  await confirmar(jogadores);

  // 3ª pergunta do mesmo tema: a festa já foi
  const proxima = await jogadores[0].cliente.esperar("escolhaPoder");
  assert.ok(proxima.oferta.every((o) => o.tipo !== "festa"));
});

// ---------- a animação de quem atacou quem ----------

test("ninguém usou poder: não há animação, a pergunta vem direto", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { tv, jogadores } = await ateEscolhaPoderComTv(porta, sala, ["Ana", "Bruno"]);
  await usarPoderes(sala, jogadores, [{ tipo: null }, { tipo: null }]);
  await tv.esperar("novaPergunta");
  await assert.rejects(() => jogadores[0].cliente.esperar("olheParaTv", 100));
});

test("a TV recebe quem atacou quem, na ordem de entrada, com os escudos por último", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { tv, jogadores } = await ateEscolhaPoderComTv(porta, sala, ["Ana", "Bruno", "Caio", "Duda"]);
  const [ana, bruno, caio, duda] = jogadores;
  await usarPoderes(sala, jogadores, [
    { tipo: "escudo" },               // Ana entrou primeiro, mas o escudo vai pro fim
    { tipo: "congelamento", alvo: 0 }, // bate no escudo da Ana
    { tipo: "nevoa", alvo: 3 },
    { tipo: null },
  ]);

  const animacao = await tv.esperar("animacaoPoderes");
  const s = animacao.sequencia;
  assert.deepEqual(s.map((m) => m.deId), [bruno.jogadorId, caio.jogadorId, ana.jogadorId]);
  assert.deepEqual(s[0], { tipo: "congelamento", deId: bruno.jogadorId, alvoId: ana.jogadorId, bloqueado: true });
  assert.deepEqual(s[1], { tipo: "nevoa", deId: caio.jogadorId, alvoId: duda.jogadorId, bloqueado: false });
  assert.deepEqual(s[2], { tipo: "escudo", deId: ana.jogadorId, bloqueios: 1 });
  assert.equal(animacao.duracaoMs, 3 * sala.cfg.tempoAnimacaoPorPoderMs, "um momento por jogador que usou poder");
  assert.ok(animacao.jogadores.every((j) => j.avatar), "a TV precisa dos animais pra desenhar os pods");
});

test("durante a animação o celular manda olhar para a TV, e depois vem a pergunta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  await usarPoderes(sala, jogadores, [{ tipo: "mordicadores", alvo: 1 }, { tipo: null }]);

  const olhe = await jogadores[1].cliente.esperar("olheParaTv");
  assert.equal(olhe.duracaoMs, sala.cfg.tempoAnimacaoPorPoderMs);
  assert.equal(sala.estado, "animacao_poderes");
  await jogadores[1].cliente.esperar("novaPergunta");
});

test("quem escolheu poder com alvo mas não escolheu o alvo a tempo não usa nem gasta", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({ tempoEscolhaAlvoMs: 100 });
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  forcarOferta(sala, jogadores[0].jogadorId, "aposta");
  jogadores[0].cliente.enviar({ type: "escolherPoder", tipo: "aposta" });
  jogadores[1].cliente.enviar({ type: "escolherPoder", tipo: null });
  await jogadores[0].cliente.esperar("escolhaAlvo");
  // ninguém escolhe alvo: o tempo acaba, e sem momento nenhum, sem animação
  await jogadores[0].cliente.esperar("novaPergunta");
  assert.equal(sala._usos(jogadores[0].jogadorId).aposta, sala.cfg.usosAposta);
});

test("as cotas de Escudo e Aposta voltam cheias numa partida nova", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const { jogadores } = await iniciarPartidaAteEscolhaPoder(porta, sala, ["Ana", "Bruno"]);
  forcarOferta(sala, jogadores[0].jogadorId, "escudo");
  jogadores[0].cliente.enviar({ type: "escolherPoder", tipo: "escudo" });
  await jogadores[0].cliente.esperar("escolhaAlvo");
  assert.equal(sala._usos(jogadores[0].jogadorId).escudo, sala.cfg.usosEscudo - 1);

  // o anfitrião reinicia e começa outra
  jogadores[0].cliente.enviar({ type: "reiniciarPartida" });
  await jogadores[0].cliente.esperar("voltouAoLobby");
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });
  await jogadores[0].cliente.esperar("escolhaPorta");
  assert.equal(sala._usos(jogadores[0].jogadorId).escudo, sala.cfg.usosEscudo);
  assert.equal(sala._usos(jogadores[0].jogadorId).aposta, sala.cfg.usosAposta);
  assert.equal(sala.festaUsadaNosTemas.size, 0);
});

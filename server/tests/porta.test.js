const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidorDeTeste, entrarNaSala } = require("./ajuda");

// tempo de votação longo de propósito: assim dá pra provar que a porta foi
// decidida pelo poder (na hora) e não porque o tempo acabou
const PORTA_LONGA = { tempoLimitePortaMs: 5000, pausaAposPortaMs: 50 };

async function ateEscolhaDePorta(porta, sala, nomes = ["Ana", "Bruno", "Carla"]) {
  const jogadores = [];
  for (const nome of nomes) jogadores.push(await entrarNaSala(porta, nome, sala.codigo));
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });
  const escolhas = await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPorta")));
  return { jogadores, portas: escolhas[0].portas };
}

test("usar o poder de garantir decide a porta na hora, sem esperar o tempo acabar", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PORTA_LONGA);
  t.after(fechar);
  const { jogadores, portas } = await ateEscolhaDePorta(porta, sala);
  const [ana, bruno, carla] = jogadores;

  const comecou = Date.now();
  ana.cliente.enviar({ type: "escolherPorta", indice: 2, garantir: true });

  // chega pra todo mundo (inclusive quem ainda nem votou) bem antes dos 5s
  const resultados = await Promise.all([
    ana.cliente.esperar("portaEscolhida", 1500),
    bruno.cliente.esperar("portaEscolhida", 1500),
    carla.cliente.esperar("portaEscolhida", 1500),
  ]);
  const demorou = Date.now() - comecou;

  assert.ok(demorou < 1000, `deveria resolver na hora, demorou ${demorou}ms`);
  for (const r of resultados) {
    assert.equal(r.categoria, portas[2]);
    assert.equal(r.garantidaPorNome, "Ana");
  }
});

test("a porta garantida vence mesmo com todos os outros votando em outra", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PORTA_LONGA);
  t.after(fechar);
  const { jogadores, portas } = await ateEscolhaDePorta(porta, sala);
  const [ana, bruno, carla] = jogadores;

  bruno.cliente.enviar({ type: "escolherPorta", indice: 0 });
  carla.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await new Promise((r) => setTimeout(r, 100));
  ana.cliente.enviar({ type: "escolherPorta", indice: 3, garantir: true });

  const resultado = await ana.cliente.esperar("portaEscolhida", 1500);
  assert.equal(resultado.categoria, portas[3], "a porta garantida tem que vencer a maioria");
  assert.equal(resultado.garantidaPorNome, "Ana");
});

test("quem usa o poder milésimos depois NÃO gasta o poder (continua com ele)", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PORTA_LONGA);
  t.after(fechar);
  const { jogadores, portas } = await ateEscolhaDePorta(porta, sala);
  const [ana, bruno] = jogadores;

  // os dois usam o poder praticamente juntos; a Ana chega primeiro no servidor
  ana.cliente.enviar({ type: "escolherPorta", indice: 1, garantir: true });
  bruno.cliente.enviar({ type: "escolherPorta", indice: 3, garantir: true });

  const resultado = await ana.cliente.esperar("portaEscolhida", 1500);
  assert.equal(resultado.categoria, portas[1], "vale a porta de quem garantiu primeiro");
  assert.equal(resultado.garantidaPorNome, "Ana");

  // o Bruno é avisado de que o poder dele não foi usado
  const aviso = await bruno.cliente.esperar("poderPortaDevolvido", 1500);
  assert.equal(aviso.garantidaPorNome, "Ana");

  // no servidor, só o poder da Ana foi gasto
  assert.ok(sala.jogadoresQueUsaramPoderPorta.has(ana.jogadorId), "o poder da Ana foi gasto");
  assert.ok(!sala.jogadoresQueUsaramPoderPorta.has(bruno.jogadorId), "o poder do Bruno NÃO pode ter sido gasto");
});

test("o poder devolvido continua disponível na rodada seguinte, e aí funciona", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({
    ...PORTA_LONGA,
    perguntasPorRodada: 1,
    tempoEscolhaPoderMs: 150,
    tempoEscolhaAlvoMs: 150,
    tempoLeituraMs: 80,
    tempoLimitePerguntaMs: 300,
  });
  t.after(fechar);
  const { jogadores } = await ateEscolhaDePorta(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;

  ana.cliente.enviar({ type: "escolherPorta", indice: 1, garantir: true });
  bruno.cliente.enviar({ type: "escolherPorta", indice: 2, garantir: true });
  await bruno.cliente.esperar("poderPortaDevolvido", 1500);
  // consome o "portaEscolhida" da rodada 1 dos dois, pra não confundir com o da rodada 2
  await Promise.all(jogadores.map((j) => j.cliente.esperar("portaEscolhida", 1500)));

  // joga a pergunta da rodada 1 até chegar na escolha de porta da rodada 2
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta", 3000)));
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta", 3000)));
  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  for (const j of jogadores) j.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPergunta", 3000)));
  for (const j of jogadores) j.cliente.enviar({ type: "continuar" });

  const [daAna, doBruno] = await Promise.all([
    ana.cliente.esperar("escolhaPorta", 3000),
    bruno.cliente.esperar("escolhaPorta", 3000),
  ]);
  assert.equal(daAna.poderPortaDisponivel, false, "a Ana já gastou o poder dela");
  assert.equal(doBruno.poderPortaDisponivel, true, "o Bruno ainda tem o poder dele");

  // e agora o poder do Bruno funciona de verdade
  bruno.cliente.enviar({ type: "escolherPorta", indice: 0, garantir: true });
  const resultado = await bruno.cliente.esperar("portaEscolhida", 1500);
  assert.equal(resultado.categoria, doBruno.portas[0]);
  assert.equal(resultado.garantidaPorNome, "Bruno");
  assert.ok(sala.jogadoresQueUsaramPoderPorta.has(bruno.jogadorId), "agora sim o poder do Bruno foi gasto");
});

test("quem usa o poder depois de o tempo acabar também não gasta o poder", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({
    tempoLimitePortaMs: 150,
    pausaAposPortaMs: 2000, // pausa longa: dá pra mandar o clique atrasado durante ela
  });
  t.after(fechar);
  const { jogadores } = await ateEscolhaDePorta(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;

  ana.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await ana.cliente.esperar("portaEscolhida", 2000); // resolveu pelo tempo

  bruno.cliente.enviar({ type: "escolherPorta", indice: 3, garantir: true });
  const aviso = await bruno.cliente.esperar("poderPortaDevolvido", 1500);
  assert.equal(aviso.garantidaPorNome, null, "ninguém tinha garantido: a porta saiu pelo tempo");
  assert.ok(!sala.jogadoresQueUsaramPoderPorta.has(bruno.jogadorId), "o poder não pode ter sido gasto");
});

test("sem ninguém usar o poder, a porta continua esperando o tempo acabar", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({
    tempoLimitePortaMs: 1200,
    pausaAposPortaMs: 50,
  });
  t.after(fechar);
  const { jogadores } = await ateEscolhaDePorta(porta, sala, ["Ana", "Bruno"]);
  const [ana, bruno] = jogadores;

  ana.cliente.enviar({ type: "escolherPorta", indice: 1 });
  bruno.cliente.enviar({ type: "escolherPorta", indice: 1 });

  // todos já votaram, mas o suspense do sorteio continua até o tempo acabar
  await assert.rejects(() => ana.cliente.esperar("portaEscolhida", 600));
  const resultado = await ana.cliente.esperar("portaEscolhida", 2000);
  assert.equal(resultado.garantidaPorNome, null);
});

test("não dá pra usar o poder duas vezes na mesma partida", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PORTA_LONGA);
  t.after(fechar);
  const { jogadores } = await ateEscolhaDePorta(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "escolherPorta", indice: 1, garantir: true });
  await ana.cliente.esperar("portaEscolhida", 1500);
  // tenta de novo na mesma rodada (a porta já foi decidida): não é erro, só não faz nada
  ana.cliente.enviar({ type: "escolherPorta", indice: 2, garantir: true });
  await assert.rejects(() => ana.cliente.esperar("erroAcao", 300));
  assert.equal(sala.jogadoresQueUsaramPoderPorta.size, 1);
});

test("a tela do tema fica mais tempo no ar quando a porta foi garantida", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({
    tempoLimitePortaMs: 4000,
    pausaAposPortaMs: 80,
    pausaAposPortaGarantidaMs: 900, // bem maior, pra dar pra medir
  });
  t.after(fechar);
  const { jogadores } = await ateEscolhaDePorta(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "escolherPorta", indice: 1, garantir: true });
  await ana.cliente.esperar("portaEscolhida", 1500);

  // com a pausa normal (80ms) a próxima fase já teria começado
  await assert.rejects(
    () => ana.cliente.esperar("escolhaPoder", 400),
    "a tela do tema tem que ficar mais tempo quando a porta foi garantida"
  );
  await ana.cliente.esperar("escolhaPoder", 1500);
});

test("sem garantia, a pausa da tela do tema continua a normal", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({
    tempoLimitePortaMs: 300,
    pausaAposPortaMs: 80,
    pausaAposPortaGarantidaMs: 5000,
  });
  t.after(fechar);
  const { jogadores } = await ateEscolhaDePorta(porta, sala, ["Ana", "Bruno"]);
  const [ana] = jogadores;

  ana.cliente.enviar({ type: "escolherPorta", indice: 1 });
  await ana.cliente.esperar("portaEscolhida", 2000);
  await ana.cliente.esperar("escolhaPoder", 800); // pausa curta, como antes
});

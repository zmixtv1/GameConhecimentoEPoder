const test = require("node:test");
const assert = require("node:assert/strict");
const {
  subirServidorDeTeste,
  criarCliente,
  entrarNaSala,
  pularEscolhaDePoder,
  avancarAteLinking,
  avancarAteSorting,
} = require("./ajuda");

const PARTIDA_CURTA = { totalRodadas: 1, perguntasPorRodada: 1 };

// Todo mundo tem que receber EXATAMENTE o mesmo placar, já com os pontos desta
// fase somados pra todos. O bug que isso pega: o placar era montado dentro do
// laço que soma os pontos, então quem era processado antes recebia os outros
// ainda com a pontuação anterior (dois jogadores viam a mesma posição com
// pontuações diferentes, enquanto a TV mostrava o placar certo).
function conferirPlacaresIguais(placares, rotulo) {
  const [primeiro, ...resto] = placares;
  for (const outro of resto) {
    assert.deepEqual(outro, primeiro, `${rotulo}: todos têm que ver o mesmo placar`);
  }
  return primeiro;
}

function conferirOrdenado(placar) {
  for (let i = 1; i < placar.length; i++) {
    assert.ok(
      placar[i - 1].pontos >= placar[i].pontos,
      "o placar tem que vir do maior pro menor"
    );
  }
}

test("pergunta: todos os jogadores (e a TV) recebem o mesmo placar, já com os pontos de todos", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({
    ...PARTIDA_CURTA,
    tempoLimitePerguntaMs: 5000,
  });
  t.after(fechar);

  const tv = criarCliente(porta);
  await tv.aberto();
  tv.enviar({ type: "identificarTv" });
  await tv.esperar("estadoSala");

  const jogadores = [];
  for (const nome of ["Ana", "Bruno", "Carla"]) {
    jogadores.push(await entrarNaSala(porta, nome, sala.codigo));
  }
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPorta")));
  for (const j of jogadores) j.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("portaEscolhida")));
  await pularEscolhaDePoder(jogadores);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta")));

  // os três acertam, em momentos diferentes: pontuações diferentes entre si
  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  for (const j of jogadores) {
    j.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
    await new Promise((r) => setTimeout(r, 120));
  }

  const resultados = await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPergunta")));
  const resultadoTv = await tv.esperar("resultadoPergunta");

  const placar = conferirPlacaresIguais(
    [...resultados.map((r) => r.placar), resultadoTv.placar],
    "pergunta"
  );
  conferirOrdenado(placar);
  assert.equal(placar.length, 3);
  // ninguém pode aparecer zerado: os três acertaram
  assert.ok(placar.every((j) => j.pontos > 0), "todos acertaram, ninguém pode estar com 0 no placar");
  // e o placar tem que bater com o que cada um diz ter ganho
  for (let i = 0; i < jogadores.length; i++) {
    const noPlacar = placar.find((j) => j.id === jogadores[i].jogadorId);
    assert.equal(noPlacar.pontos, resultados[i].seuResultado.pontosGanhos);
  }
});

test("pergunta: jogadores com pontuações diferentes nunca ficam na mesma posição", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste({
    ...PARTIDA_CURTA,
    tempoLimitePerguntaMs: 5000,
  });
  t.after(fechar);

  const jogadores = [];
  for (const nome of ["Ana", "Bruno", "Carla"]) {
    jogadores.push(await entrarNaSala(porta, nome, sala.codigo));
  }
  jogadores[0].cliente.enviar({ type: "iniciarPartida" });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("escolhaPorta")));
  for (const j of jogadores) j.cliente.enviar({ type: "escolherPorta", indice: 0 });
  await Promise.all(jogadores.map((j) => j.cliente.esperar("portaEscolhida")));
  await pularEscolhaDePoder(jogadores);
  await Promise.all(jogadores.map((j) => j.cliente.esperar("novaPergunta")));
  await Promise.all(jogadores.map((j) => j.cliente.esperar("iniciarResposta")));

  const indiceCorreto = sala.perguntaAtual.indiceCorreto;
  for (const j of jogadores) {
    j.cliente.enviar({ type: "responder", alternativaIndex: indiceCorreto });
    await new Promise((r) => setTimeout(r, 150));
  }
  const resultados = await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoPergunta")));

  // mesma conta que o celular faz pra mostrar "Sua posição"
  const posicaoDe = (placar, id) => {
    const eu = placar.find((j) => j.id === id);
    return placar.filter((j) => j.pontos > eu.pontos).length + 1;
  };

  const vistos = jogadores.map((j, i) => ({
    pontos: resultados[i].placar.find((x) => x.id === j.jogadorId).pontos,
    posicao: posicaoDe(resultados[i].placar, j.jogadorId),
  }));

  for (const a of vistos) {
    for (const b of vistos) {
      if (a.pontos !== b.pontos) {
        assert.notEqual(
          a.posicao,
          b.posicao,
          `pontuações diferentes (${a.pontos} e ${b.pontos}) não podem dar a mesma posição`
        );
      }
    }
  }
});

test("Linking: todos recebem o mesmo placar, já com os pontos de todos", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PARTIDA_CURTA);
  t.after(fechar);
  const { jogadores } = await avancarAteLinking(porta, sala, ["Ana", "Bruno", "Carla"]);

  // eles chegam no Linking já com pontos das perguntas anteriores
  const pontosAntes = new Map(
    jogadores.map((j) => [j.jogadorId, sala.jogadores.get(j.jogadorId).pontos])
  );

  // só a Ana e o Bruno completam os pares, em momentos diferentes
  const totalPares = sala.linkingAtual.pares.length;
  for (const j of jogadores.slice(0, 2)) {
    const progresso = sala.linkingAtual.progresso.get(j.jogadorId);
    for (let esquerdaIndex = 0; esquerdaIndex < totalPares; esquerdaIndex++) {
      j.cliente.enviar({
        type: "tentarPar",
        esquerdaIndex,
        direitaIndex: progresso.direitaEmbaralhadaIndices.indexOf(esquerdaIndex),
      });
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const resultados = await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoLinking", 3000)));
  const placar = conferirPlacaresIguais(resultados.map((r) => r.placar), "linking");
  conferirOrdenado(placar);
  for (let i = 0; i < jogadores.length; i++) {
    const id = jogadores[i].jogadorId;
    const noPlacar = placar.find((j) => j.id === id);
    assert.equal(
      noPlacar.pontos,
      pontosAntes.get(id) + resultados[i].pontosGanhos,
      "o placar tem que incluir os pontos que cada um ganhou no Linking"
    );
  }
});

test("Sorting: todos recebem o mesmo placar, já com os pontos de todos", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste(PARTIDA_CURTA);
  t.after(fechar);
  const { jogadores } = await avancarAteSorting(porta, sala, ["Ana", "Bruno", "Carla"]);

  // cada um acerta uma quantidade diferente de itens
  jogadores.forEach((j, indice) => {
    const progresso = sala.sortingAtual.progresso.get(j.jogadorId);
    for (let itemIndex = 0; itemIndex < progresso.itens.length; itemIndex++) {
      const certo = progresso.gabarito[itemIndex];
      const errado = certo === "A" ? "B" : "A";
      j.cliente.enviar({
        type: "classificarItem",
        itemIndex,
        categoria: itemIndex <= indice ? errado : certo,
      });
    }
  });

  const resultados = await Promise.all(jogadores.map((j) => j.cliente.esperar("resultadoSorting", 3000)));
  const placar = conferirPlacaresIguais(resultados.map((r) => r.placar), "sorting");
  conferirOrdenado(placar);
  // pontuações diferentes entre si (cada um errou uma quantidade diferente)
  const pontuacoes = jogadores.map((j) => placar.find((x) => x.id === j.jogadorId).pontos);
  assert.equal(new Set(pontuacoes).size, 3, "os três deveriam ter pontuações diferentes");
});

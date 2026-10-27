// Testes do conteúdo real: o banco de perguntas e os desafios como estão em
// data/, contra a configuração real da partida (PADROES).
//
// Os outros testes usam CONFIG_TESTE, que encurta a partida pra 2 temas. Aqui
// é o contrário: ninguém joga nada, mas o sorteio roda com os 5 temas e as
// dificuldades de verdade, pra garantir que o acervo aguenta uma partida
// inteira. É o teste que avisa quando uma pergunta nova entra com o nível
// escrito errado, ou quando um tema fica sem estoque.

const test = require("node:test");
const assert = require("node:assert");

const { validar, NIVEIS } = require("../validarBanco");
const { sortearPergunta, sortearPortas, listarCategorias } = require("../perguntas");
const { PADROES } = require("../sala");

// Cada pergunta sorteada relê o perguntas.json do disco, então simular sai
// caro: as partidas são simuladas UMA vez e todas as regras são conferidas em
// cima do mesmo resultado.
const PARTIDAS_SIMULADAS = 120;

// Joga uma partida "no papel": só o sorteio de portas e de perguntas, sem
// servidor nem jogadores. Devolve o que caiu, pra conferir as regras.
function simularPartida(cfg) {
  const usados = [];
  const temasJogados = [];
  const rodadas = [];

  for (let rodada = 1; rodada <= cfg.totalRodadas; rodada++) {
    const dificuldade = cfg.dificuldadesPorRodada[rodada - 1];
    const portas = sortearPortas(4, {
      dificuldade,
      idsExcluidos: usados,
      temasJogados,
      minimo: cfg.perguntasPorRodada,
    });
    const escolhido = portas[Math.floor(Math.random() * portas.length)];
    temasJogados.push(escolhido);

    const perguntas = [];
    for (let i = 0; i < cfg.perguntasPorRodada; i++) {
      const p = sortearPergunta(escolhido, usados, dificuldade);
      usados.push(p.id);
      perguntas.push(p);
    }
    rodadas.push({ rodada, dificuldade, portas, escolhido, perguntas });
  }

  // a Pirâmide puxa de qualquer tema e nível, até alguém chegar ao topo
  const piramide = [];
  for (let i = 0; i < 60; i++) {
    const p = sortearPergunta(null, usados, null);
    usados.push(p.id);
    piramide.push(p);
  }

  return { rodadas, piramide, usados };
}

test("o banco de conteúdo não tem erro de formato", () => {
  const r = validar({
    porRodada: PADROES.perguntasPorRodada,
    dificuldades: PADROES.dificuldadesPorRodada,
  });
  assert.deepEqual(r.erros, [], `o banco tem erro(s):\n  ${r.erros.join("\n  ")}`);
});

test("toda pergunta tem um nível válido e 4 alternativas distintas", () => {
  const banco = require("../../data/perguntas.json");
  for (const p of banco) {
    assert.ok(NIVEIS.includes(p.dificuldade), `pergunta ${p.id}: nível "${p.dificuldade}"`);
    const alternativas = [p.resposta_correta, ...p.alternativas_erradas];
    assert.equal(alternativas.length, 4, `pergunta ${p.id}: não tem 4 alternativas`);
    assert.equal(new Set(alternativas).size, 4, `pergunta ${p.id}: tem alternativa repetida`);
  }
});

test(`${PARTIDAS_SIMULADAS} partidas com a config real seguem todas as regras do sorteio`, () => {
  const banco = require("../../data/perguntas.json");

  for (let n = 0; n < PARTIDAS_SIMULADAS; n++) {
    const partida = simularPartida(PADROES);

    // nenhuma pergunta cai duas vezes - nem nas rodadas, nem na Pirâmide
    assert.equal(
      new Set(partida.usados).size,
      partida.usados.length,
      "a mesma pergunta caiu duas vezes na partida"
    );

    // a Pirâmide aguenta uma corrida longa (todo mundo errando muito)
    assert.equal(partida.piramide.length, 60);

    for (const r of partida.rodadas) {
      // sempre 4 portas distintas
      assert.equal(r.portas.length, 4, `tema ${r.rodada}: vieram ${r.portas.length} portas`);
      assert.equal(new Set(r.portas).size, 4, `tema ${r.rodada}: porta repetida na mesma votação`);

      // e toda porta oferecida aguenta as 3 perguntas do nível da rodada
      for (const porta of r.portas) {
        const estoque = banco.filter(
          (p) => p.categoria === porta && p.dificuldade === r.dificuldade
        ).length;
        assert.ok(
          estoque >= PADROES.perguntasPorRodada,
          `tema ${r.rodada} (${r.dificuldade}): a porta "${porta}" só tem ${estoque} pergunta(s)`
        );
      }

      // as perguntas saem do tema escolhido, no nível daquele tema
      for (const p of r.perguntas) {
        assert.equal(p.categoria, r.escolhido, `tema ${r.rodada}: veio pergunta de ${p.categoria}`);
        assert.equal(
          p.dificuldade,
          r.dificuldade,
          `tema ${r.rodada} (${r.escolhido}) pediu ${r.dificuldade} e veio ${p.dificuldade}`
        );
      }
    }
  }
});

test("cada nível tem tema suficiente pra montar as 4 portas", () => {
  const banco = require("../../data/perguntas.json");
  const temas = listarCategorias();
  for (const nivel of new Set(PADROES.dificuldadesPorRodada)) {
    const aptos = temas.filter(
      (t) => banco.filter((p) => p.categoria === t && p.dificuldade === nivel).length >= PADROES.perguntasPorRodada
    );
    assert.ok(
      aptos.length >= 4,
      `nível "${nivel}": só ${aptos.length} tema(s) têm ${PADROES.perguntasPorRodada} perguntas (precisa de 4 pra encher as portas)`
    );
  }
});

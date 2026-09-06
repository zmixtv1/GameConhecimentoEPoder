const test = require("node:test");
const assert = require("node:assert/strict");
const { sortearPergunta, listarCategorias, sortearPortas } = require("../perguntas");

test("listarCategorias: retorna categorias não vazias e sem duplicatas", () => {
  const categorias = listarCategorias();
  assert.ok(categorias.length >= 4, "esperava várias categorias no banco");
  assert.equal(new Set(categorias).size, categorias.length, "não deveria ter categoria repetida");
});

test("sortearPergunta: pergunta tem 4 alternativas e a resposta correta está entre elas", () => {
  for (let i = 0; i < 20; i++) {
    const p = sortearPergunta();
    assert.equal(p.alternativas.length, 4);
    assert.ok(p.indiceCorreto >= 0 && p.indiceCorreto < 4);
    assert.equal(new Set(p.alternativas).size, 4, "não deveria repetir alternativa");
  }
});

test("sortearPergunta(categoria): só retorna perguntas daquela categoria", () => {
  const categoria = listarCategorias()[0];
  for (let i = 0; i < 25; i++) {
    const p = sortearPergunta(categoria);
    assert.equal(p.categoria, categoria);
  }
});

test("sortearPergunta(categoria, excluidos): nunca repete um id já usado na mesma partida", () => {
  const categoria = listarCategorias()[0];
  const usados = [];
  for (let i = 0; i < 15; i++) {
    const p = sortearPergunta(categoria, usados);
    assert.ok(!usados.includes(p.id), `pergunta id=${p.id} repetida depois de já ter caído`);
    usados.push(p.id);
  }
});

test("sortearPortas: retorna N categorias distintas dentre as existentes", () => {
  const todasCategorias = new Set(listarCategorias());
  const portas = sortearPortas(4);
  assert.equal(portas.length, 4);
  assert.equal(new Set(portas).size, 4, "portas não deveriam se repetir");
  for (const p of portas) assert.ok(todasCategorias.has(p));
});

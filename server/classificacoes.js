const fs = require("fs");
const path = require("path");

const CAMINHO_BANCO = path.join(__dirname, "..", "data", "classificacoes.json");

function carregarBanco() {
  return JSON.parse(fs.readFileSync(CAMINHO_BANCO, "utf-8"));
}

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Sorteia só o CONJUNTO de itens (categorias + itens na ordem original).
// Não embaralha aqui - cada jogador recebe sua própria ordem, senão todo
// mundo veria os itens na mesma posição na tela.
function sortearConjuntoClassificacao() {
  const banco = carregarBanco();
  const escolhido = banco[Math.floor(Math.random() * banco.length)];
  return { id: escolhido.id, categoriaA: escolhido.categoriaA, categoriaB: escolhido.categoriaB, itens: escolhido.itens };
}

// Gera uma ordem embaralhada independente dos itens pra um jogador.
function embaralharParaJogador(itens) {
  const itensEmbaralhados = embaralhar(itens);
  return {
    itens: itensEmbaralhados.map((it) => it.nome), // só o nome vai pro cliente
    gabarito: itensEmbaralhados.map((it) => it.categoria), // uso interno do servidor
  };
}

module.exports = { sortearConjuntoClassificacao, embaralharParaJogador };

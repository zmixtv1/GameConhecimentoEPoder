const fs = require("fs");
const path = require("path");

const CAMINHO_BANCO = path.join(__dirname, "..", "data", "associacoes.json");

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

// Sorteia só o CONJUNTO de pares (tema + pares na ordem original). Não
// embaralha nada aqui - cada jogador recebe seu próprio embaralhamento da
// coluna da direita, senão todo mundo veria a mesma ordem na tela (e dava
// pra "colar" só olhando o celular do vizinho).
//
// idsExcluidos evita repetir um conjunto que já caiu na mesma partida - com
// um desafio por tema, sortear às cegas repetia em quase toda partida. Se o
// acervo esgotar, volta a permitir repetição em vez de travar o jogo.
function sortearConjuntoAssociacao(idsExcluidos = []) {
  const banco = carregarBanco();
  const ineditos = banco.filter((c) => !idsExcluidos.includes(c.id));
  const candidatos = ineditos.length > 0 ? ineditos : banco;
  const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
  return { id: escolhido.id, tema: escolhido.tema, pares: escolhido.pares };
}

// Gera um embaralhamento independente da coluna da direita pra um jogador.
function embaralharParaJogador(pares) {
  const indices = pares.map((_, i) => i);
  const direitaEmbaralhadaIndices = embaralhar(indices);
  return {
    direita: direitaEmbaralhadaIndices.map((i) => pares[i].direita),
    direitaEmbaralhadaIndices, // gabarito: posição k da direita corresponde ao índice direitaEmbaralhadaIndices[k] da esquerda
  };
}

module.exports = { sortearConjuntoAssociacao, embaralharParaJogador };

const fs = require("fs");
const path = require("path");

const CAMINHO_BANCO = path.join(__dirname, "..", "data", "perguntas.json");

function carregarBanco() {
  const conteudo = fs.readFileSync(CAMINHO_BANCO, "utf-8");
  return JSON.parse(conteudo);
}

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Sorteia uma pergunta e devolve com as 4 alternativas já embaralhadas,
// junto com o índice de qual delas é a correta (uso interno do servidor,
// nunca é mandado pro cliente antes da revelação).
//
// idsExcluidos evita repetir, dentro da mesma partida, uma pergunta que já caiu.
function sortearPergunta(categoria, idsExcluidos = []) {
  const banco = carregarBanco();
  let candidatas = categoria
    ? banco.filter((p) => p.categoria === categoria)
    : banco;

  const semRepetidas = candidatas.filter((p) => !idsExcluidos.includes(p.id));
  if (semRepetidas.length > 0) candidatas = semRepetidas;
  // se a categoria esgotou (muito improvável, 40+ perguntas por tema),
  // cai pra permitir repetição em vez de travar o jogo.

  const escolhida = candidatas[Math.floor(Math.random() * candidatas.length)];

  const alternativas = embaralhar([
    escolhida.resposta_correta,
    ...escolhida.alternativas_erradas,
  ]);
  const indiceCorreto = alternativas.indexOf(escolhida.resposta_correta);

  return {
    id: escolhida.id,
    categoria: escolhida.categoria,
    dificuldade: escolhida.dificuldade,
    pergunta: escolhida.pergunta,
    alternativas,
    indiceCorreto,
  };
}

function listarCategorias() {
  const banco = carregarBanco();
  return [...new Set(banco.map((p) => p.categoria))];
}

// Sorteia N categorias distintas pra virarem "portas" numa rodada.
function sortearPortas(quantidade = 4) {
  const categorias = embaralhar(listarCategorias());
  return categorias.slice(0, quantidade);
}

module.exports = { sortearPergunta, listarCategorias, sortearPortas };

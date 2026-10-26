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
// dificuldade ("facil" | "medio" | "dificil") restringe ao nível do tema.
//
// Quando não há pergunta inédita no nível pedido, afrouxa em degraus em vez de
// travar o jogo: primeiro aceita outro nível do mesmo tema, depois aceita
// repetir. As portas já evitam oferecer tema sem estoque (ver sortearPortas),
// então isso só acontece se o banco encolher no meio da partida.
function sortearPergunta(categoria, idsExcluidos = [], dificuldade = null) {
  const banco = carregarBanco();
  const doTema = categoria ? banco.filter((p) => p.categoria === categoria) : banco;
  const ineditas = doTema.filter((p) => !idsExcluidos.includes(p.id));
  const noNivel = dificuldade ? ineditas.filter((p) => p.dificuldade === dificuldade) : ineditas;

  let candidatas = noNivel;
  if (candidatas.length === 0) candidatas = ineditas;
  if (candidatas.length === 0) candidatas = doTema;

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

// Quantas perguntas inéditas um tema ainda tem num nível.
function contarDisponiveis(banco, categoria, dificuldade, idsExcluidos) {
  return banco.filter(
    (p) =>
      p.categoria === categoria &&
      !idsExcluidos.includes(p.id) &&
      (!dificuldade || p.dificuldade === dificuldade)
  ).length;
}

// Sorteia N temas distintos pra virarem "portas" numa rodada.
//
// Só oferece tema que tenha pelo menos `minimo` perguntas inéditas no nível da
// rodada - senão o grupo poderia escolher um tema que não aguenta as 3
// perguntas. É isso que impede o tema difícil de cair em Esportes, que hoje só
// tem 1 pergunta difícil.
//
// Também prefere temas que ainda não foram jogados na partida, para os 5
// temas serem 5 assuntos diferentes. Se não houver temas inéditos suficientes,
// completa com os já jogados; e se nem assim fechar a quantidade, completa
// com os que têm mais estoque, para nunca abrir a votação com menos portas.
function sortearPortas(quantidade = 4, { dificuldade = null, idsExcluidos = [], temasJogados = [], minimo = 1 } = {}) {
  const banco = carregarBanco();
  const categorias = listarCategorias();
  const estoque = new Map(
    categorias.map((c) => [c, contarDisponiveis(banco, c, dificuldade, idsExcluidos)])
  );

  const elegiveis = categorias.filter((c) => estoque.get(c) >= minimo);
  const ineditos = embaralhar(elegiveis.filter((c) => !temasJogados.includes(c)));
  const repetidos = embaralhar(elegiveis.filter((c) => temasJogados.includes(c)));
  const reserva = categorias
    .filter((c) => !elegiveis.includes(c))
    .sort((a, b) => estoque.get(b) - estoque.get(a));

  return [...ineditos, ...repetidos, ...reserva].slice(0, quantidade);
}

module.exports = { sortearPergunta, listarCategorias, sortearPortas };

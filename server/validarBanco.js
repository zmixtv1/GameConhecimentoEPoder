// Confere o banco de conteúdo antes de a partida começar.
//
// Serve pra pegar erro de digitação ao adicionar pergunta nova: nível escrito
// errado ("difícil" com acento), tema que não existe, id repetido, alternativa
// igual à resposta certa. Sem isso o erro só apareceria no meio de uma partida,
// com gente na sala.
//
// Uso: node server/validarBanco.js   (ou npm run validar, dentro de server/)

const fs = require("fs");
const path = require("path");

const DIR_DADOS = path.join(__dirname, "..", "data");
const NIVEIS = ["facil", "medio", "dificil"];

function carregar(arquivo) {
  return JSON.parse(fs.readFileSync(path.join(DIR_DADOS, arquivo), "utf-8"));
}

// Normaliza pra comparar textos: sem acento, sem maiúscula, sem pontuação
// final. É assim que duas perguntas "iguais mas digitadas diferente" aparecem.
function normalizar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function validarPerguntas(erros, avisos) {
  const banco = carregar("perguntas.json");
  if (!Array.isArray(banco)) {
    erros.push("perguntas.json: o arquivo tem que ser uma lista []");
    return { banco: [], temas: [] };
  }

  const temas = [...new Set(banco.map((p) => p.categoria))].filter(Boolean);
  const idsVistos = new Map();
  const textosVistos = new Map();
  // Duas perguntas do mesmo tema com a mesma resposta costumam ser o mesmo
  // fato escrito de outro jeito ("Quem pintou A Noite Estrelada?" e "Qual
  // pintor holandês é autor de Noite Estrelada?"). Na partida isso cansa:
  // o jogador responde a mesma coisa duas vezes.
  const respostasVistas = new Map();

  banco.forEach((p, i) => {
    const onde = `pergunta ${p.id ?? `na posição ${i}`}`;

    if (!Number.isInteger(p.id)) erros.push(`${onde}: "id" tem que ser um número inteiro`);
    else if (idsVistos.has(p.id)) erros.push(`${onde}: id repetido (já usado por "${idsVistos.get(p.id)}")`);
    else idsVistos.set(p.id, String(p.pergunta).slice(0, 40));

    if (!p.categoria) erros.push(`${onde}: sem "categoria"`);
    if (!NIVEIS.includes(p.dificuldade)) {
      erros.push(`${onde}: dificuldade "${p.dificuldade}" não existe (use ${NIVEIS.join(", ")})`);
    }

    if (!p.pergunta || !String(p.pergunta).trim()) erros.push(`${onde}: sem texto da pergunta`);
    if (!p.resposta_correta || !String(p.resposta_correta).trim()) erros.push(`${onde}: sem "resposta_correta"`);

    const erradas = p.alternativas_erradas;
    if (!Array.isArray(erradas) || erradas.length !== 3) {
      erros.push(`${onde}: precisa de exatamente 3 "alternativas_erradas" (tem ${Array.isArray(erradas) ? erradas.length : "nenhuma"})`);
    } else {
      const todas = [p.resposta_correta, ...erradas].map(normalizar);
      const repetida = todas.find((t, k) => todas.indexOf(t) !== k);
      if (repetida) erros.push(`${onde}: tem duas alternativas iguais ("${repetida}") — uma delas é a resposta certa`);
      if (erradas.some((a) => !String(a ?? "").trim())) erros.push(`${onde}: tem alternativa vazia`);
    }

    const chave = normalizar(p.pergunta);
    if (chave && textosVistos.has(chave)) {
      avisos.push(`${onde}: mesmo enunciado da pergunta ${textosVistos.get(chave)}`);
    } else if (chave) {
      textosVistos.set(chave, p.id);
    }

    if (p.categoria && p.resposta_correta) {
      const chaveResposta = `${p.categoria}|${normalizar(p.resposta_correta)}`;
      if (!respostasVistas.has(chaveResposta)) respostasVistas.set(chaveResposta, []);
      respostasVistas.get(chaveResposta).push(p);
    }
  });

  // Agrupado, e não par a par: com três perguntas de mesma resposta, mostrar
  // só o primeiro par escondia a repetição de verdade.
  for (const [chave, grupo] of respostasVistas) {
    if (grupo.length < 2) continue;
    const resposta = chave.split("|").slice(1).join("|");
    avisos.push(
      `mesma resposta ("${grupo[0].resposta_correta}") em ${grupo.length} perguntas de ${grupo[0].categoria} — confira se não é o mesmo fato:\n` +
        grupo.map((p) => `      ${p.id} [${p.dificuldade}] ${p.pergunta}`).join("\n")
    );
  }

  return { banco, temas };
}

function validarDesafios(erros) {
  const assoc = carregar("associacoes.json");
  assoc.forEach((c) => {
    if (!Array.isArray(c.pares) || c.pares.length < 2) {
      erros.push(`associação ${c.id}: precisa de pelo menos 2 pares`);
    }
    const direitas = (c.pares || []).map((p) => normalizar(p.direita));
    const rep = direitas.find((d, k) => direitas.indexOf(d) !== k);
    // duas respostas iguais tornam o par ambíguo: o jogador liga na "errada" certa
    if (rep) erros.push(`associação ${c.id}: duas opções da direita são iguais ("${rep}")`);
  });

  const classif = carregar("classificacoes.json");
  classif.forEach((c) => {
    if (!c.categoriaA || !c.categoriaB) erros.push(`classificação ${c.id}: falta categoriaA ou categoriaB`);
    const fora = (c.itens || []).filter((it) => it.categoria !== "A" && it.categoria !== "B");
    if (fora.length) erros.push(`classificação ${c.id}: ${fora.length} item(ns) com categoria diferente de "A"/"B"`);
    if (!c.itens || c.itens.length < 2) erros.push(`classificação ${c.id}: precisa de pelo menos 2 itens`);
  });

  return { assoc, classif };
}

// A partida precisa de `perguntasPorRodada` perguntas de um mesmo tema no nível
// da rodada. Tema que não alcança isso simplesmente não é oferecido como porta
// naquele nível - o jogo continua funcionando, mas o tema some daquela rodada.
function relatorioDeEstoque(banco, temas, porRodada, dificuldades) {
  const linhas = [];
  const faltando = [];
  for (const tema of temas.sort()) {
    const conta = {};
    for (const n of NIVEIS) conta[n] = banco.filter((p) => p.categoria === tema && p.dificuldade === n).length;
    linhas.push({ tema, ...conta });
    for (const n of new Set(dificuldades)) {
      if (conta[n] < porRodada) faltando.push({ tema, nivel: n, tem: conta[n] });
    }
  }
  return { linhas, faltando };
}

function validar({ porRodada = 3, dificuldades = NIVEIS } = {}) {
  const erros = [];
  const avisos = [];
  const { banco, temas } = validarPerguntas(erros, avisos);
  validarDesafios(erros);
  const estoque = relatorioDeEstoque(banco, temas, porRodada, dificuldades);
  return { erros, avisos, estoque, total: banco.length, temas };
}

// rodado direto pelo terminal
if (require.main === module) {
  const { PADROES } = require("./sala");
  const r = validar({
    porRodada: PADROES.perguntasPorRodada,
    dificuldades: PADROES.dificuldadesPorRodada,
  });

  console.log(`Banco: ${r.total} perguntas em ${r.temas.length} temas\n`);
  console.log("tema".padEnd(22) + NIVEIS.map((n) => n.padStart(9)).join(""));
  for (const l of r.estoque.linhas) {
    console.log(l.tema.padEnd(22) + NIVEIS.map((n) => String(l[n]).padStart(9)).join(""));
  }

  if (r.estoque.faltando.length) {
    console.log(`\nTemas que NÃO podem ser sorteados em alguma rodada (precisam de ${PADROES.perguntasPorRodada}):`);
    for (const f of r.estoque.faltando) console.log(`  ${f.tema} no nível "${f.nivel}": só tem ${f.tem}`);
  }

  if (r.avisos.length) {
    console.log(`\n${r.avisos.length} aviso(s):`);
    for (const a of r.avisos) console.log(`  ${a}`);
  }

  if (r.erros.length) {
    console.log(`\n${r.erros.length} ERRO(S):`);
    for (const e of r.erros) console.log(`  ${e}`);
    process.exit(1);
  }
  console.log("\nBanco sem erros.");
}

module.exports = { validar, normalizar, NIVEIS };

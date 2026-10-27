// Celular: desafio de Classificação, durante e resultado.
// Referência: controle_classificacao.html.
//
// Uma carta no meio com o item e um painel de cada categoria nas laterais.
// Arraste a carta para um lado, dê um peteleco ou toque direto no painel. A
// carta voa para o painel, que pisca verde ou vermelho quando o servidor
// responde, e a próxima sai do monte. Cada item vale uma tentativa.
window.CelularClassificacao = (() => {
  const $ = (id) => document.getElementById(id);

  const arena = $("arena");
  const moeda = $("moeda");
  const buracos = { A: $("buraco-a"), B: $("buraco-b") };

  let enviar = () => {};
  let intervaloTimer = null;

  let itens = [];
  let pontosPorItem = 25;
  let atual = 0; // índice do item na moeda
  let respostas = new Map(); // itemIndex → { categoria, correto? }
  let ocupado = false; // moeda caindo / esperando o servidor
  let terminou = false;

  function criarEl(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  // ---------- Timer ----------
  const CIRC = 326.7;
  function iniciarTimer(ms) {
    clearInterval(intervaloTimer);
    const anel = $("anel-sorting"), numero = $("numero-sorting"), modulo = $("timer-sorting");
    const inicio = Date.now();
    const atualizar = () => {
      const dec = Date.now() - inicio;
      const resta = Math.max(0, ms - dec);
      anel.style.strokeDashoffset = String(CIRC * Math.min(1, dec / ms));
      const s = Math.ceil(resta / 1000);
      numero.textContent = String(s);
      modulo.classList.toggle("urgente", s <= 5 && s > 0 && !terminou);
      if (resta <= 0) clearInterval(intervaloTimer);
    };
    atualizar();
    intervaloTimer = setInterval(atualizar, 100);
  }

  // ---------- Progresso ----------
  function atualizarBolinhas() {
    $("sorting-progresso").replaceChildren(...itens.map((_, i) => {
      const r = respostas.get(i);
      let cls = "";
      if (r && r.correto === true) cls = "certo";
      else if (r && r.correto === false) cls = "errado";
      else if (i === atual && !terminou) cls = "atual";
      return criarEl("i", cls);
    }));
  }

  // ---------- Moeda ----------
  function ajustarFonte(texto) {
    // O tamanho segue a MAIOR palavra (quebra só em espaço ou hífen, nunca no meio)
    const maior = Math.max(...texto.split(/[\s-]+/).map((p) => p.length + (texto.includes("-") ? 1 : 0)));
    const tam = Math.min(.24, 1.45 / Math.max(1, maior), .62 / Math.sqrt(texto.length));
    moeda.style.setProperty("--fonte", `calc(var(--moeda) * ${tam.toFixed(3)})`);
  }

  function mostrarMoeda() {
    if (atual >= itens.length) return;
    $("moeda-texto").textContent = itens[atual];
    ajustarFonte(itens[atual]);
    moeda.classList.remove("oculto", "voltando");
    moeda.style.transform = "";
    moeda.style.opacity = "";
    moeda.classList.remove("entrando");
    void moeda.offsetWidth;
    moeda.classList.add("entrando");
    ocupado = false;
    atualizarBolinhas();
  }

  function centroDe(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // A carta voa para o lado escolhido e some dentro da zona
  function jogarNoBuraco(cat) {
    if (ocupado || terminou || atual >= itens.length) return;
    ocupado = true;
    buracos.A.classList.remove("mira");
    buracos.B.classList.remove("mira");

    const zona = buracos[cat];
    const de = centroDe(moeda), para = centroDe(zona);
    const atualT = moeda.style.transform || "translate(0px, 0px)";
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(atualT) || [0, 0, 0];
    const x0 = Number(m[1]), y0 = Number(m[2]);
    const dx = para.x - de.x + x0, dy = para.y - de.y + y0;
    const giro = cat === "A" ? -18 : 18;

    moeda.classList.remove("entrando", "voltando", "arrastando");
    const anim = moeda.animate([
      { transform: `translate(${x0}px, ${y0}px) rotate(${x0 * .08}deg) scale(1)`, opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${giro}deg) scale(.55)`, opacity: .9, offset: .8 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${giro}deg) scale(.3)`, opacity: 0 },
    ], { duration: 320, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });

    const itemIndex = atual;
    respostas.set(itemIndex, { categoria: cat });
    if (navigator.vibrate) navigator.vibrate(15);
    anim.onfinish = () => {
      moeda.classList.add("oculto");
      if (atual >= itens.length - 1) $("monte").classList.add("vazio");
      anim.cancel();
      enviar(itemIndex, cat);
    };
  }

  function mostrarFeedback(cat, correto) {
    const b = buracos[cat];
    b.classList.remove("acertou", "errou");
    void b.offsetWidth;
    b.classList.add(correto ? "acertou" : "errou");
    const f = criarEl("span", "feedback " + (correto ? "ok" : "nao"), correto ? `✓ +${pontosPorItem}` : "✗ Errou");
    b.append(f);
    setTimeout(() => { f.remove(); b.classList.remove("acertou", "errou"); }, 900);
    if (!correto && navigator.vibrate) navigator.vibrate([30, 40, 30]);
  }

  function mostrarTerminou() {
    if (arena.querySelector(".terminou")) return;
    terminou = true;
    const certos = [...respostas.values()].filter((r) => r.correto).length;
    const t = criarEl("div", "terminou");
    t.append(criarEl("span", "grande", "🎉"), criarEl("b", "", "Tudo separado!"),
      criarEl("small", "", `${certos} de ${itens.length} certos · aguardando os outros…`));
    arena.append(t);
    atualizarBolinhas();
  }

  // ---------- Arrastar / peteleco / tocar no buraco ----------
  let arrasto = null; // { x0, y0, ultimoX, ultimoT, vx }

  moeda.addEventListener("pointerdown", (ev) => {
    if (ocupado || terminou) return;
    ev.preventDefault();
    moeda.setPointerCapture(ev.pointerId);
    moeda.classList.remove("entrando", "voltando");
    moeda.classList.add("arrastando");
    arrasto = { x0: ev.clientX, y0: ev.clientY, ultimoX: ev.clientX, ultimoT: performance.now(), vx: 0 };
    $("dica").style.visibility = "hidden";
  });

  moeda.addEventListener("pointermove", (ev) => {
    if (!arrasto) return;
    const dx = ev.clientX - arrasto.x0, dy = ev.clientY - arrasto.y0;
    moeda.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * .08}deg)`;
    const agora = performance.now();
    const dt = Math.max(1, agora - arrasto.ultimoT);
    arrasto.vx = (ev.clientX - arrasto.ultimoX) / dt; // px/ms
    arrasto.ultimoX = ev.clientX;
    arrasto.ultimoT = agora;
    const alvo = buracoSob(ev.clientX, ev.clientY);
    buracos.A.classList.toggle("mira", alvo === "A");
    buracos.B.classList.toggle("mira", alvo === "B");
  });

  function soltar(ev) {
    if (!arrasto) return;
    const a = arrasto;
    arrasto = null;
    moeda.classList.remove("arrastando");
    const dx = ev.clientX - a.x0;
    const larguraArena = arena.getBoundingClientRect().width;

    let cat = buracoSob(ev.clientX, ev.clientY);
    // Peteleco: soltou rápido para o lado, mesmo sem chegar no buraco
    if (!cat && Math.abs(a.vx) > 0.6 && Math.abs(dx) > 25) cat = a.vx < 0 ? "A" : "B";
    // Arrastou bastante para um lado
    if (!cat && Math.abs(dx) > larguraArena * 0.22) cat = dx < 0 ? "A" : "B";

    if (cat) jogarNoBuraco(cat);
    else {
      buracos.A.classList.remove("mira");
      buracos.B.classList.remove("mira");
      moeda.classList.add("voltando");
      moeda.style.transform = "";
    }
  }
  moeda.addEventListener("pointerup", soltar);
  moeda.addEventListener("pointercancel", soltar);

  function buracoSob(x, y) {
    for (const cat of ["A", "B"]) {
      const r = buracos[cat].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return cat;
    }
    return null;
  }

  // Atalho: tocar no buraco joga a moeda nele
  for (const cat of ["A", "B"]) buracos[cat].addEventListener("click", () => jogarNoBuraco(cat));

  // ---------- Mensagens do servidor ----------

  // iniciarSorting { categoriaA, categoriaB, itens, tempoLimiteMs, pontosPorItem }
  // e, ao voltar de uma queda, também { respondidos: [{ itemIndex, categoria, correto }] }.
  // aoClassificar(itemIndex, "A" | "B"). A tela já tem que estar visível.
  function montar(msg, aoClassificar) {
    enviar = aoClassificar;
    $("nome-cat-a").textContent = msg.categoriaA;
    $("nome-cat-b").textContent = msg.categoriaB;
    itens = msg.itens;
    if (msg.pontosPorItem) pontosPorItem = msg.pontosPorItem;
    respostas = new Map((msg.respondidos || []).map((r) => [r.itemIndex, { categoria: r.categoria, correto: r.correto }]));
    // segue do primeiro item que ainda não foi classificado
    atual = 0;
    while (atual < itens.length && respostas.has(atual)) atual++;
    terminou = false;
    arrasto = null;
    arena.querySelector(".terminou")?.remove();
    buracos.A.classList.remove("mira", "acertou", "errou");
    buracos.B.classList.remove("mira", "acertou", "errou");
    $("monte").classList.toggle("vazio", atual >= itens.length);
    $("dica").style.visibility = respostas.size ? "hidden" : "";
    if (atual >= itens.length) {
      moeda.classList.add("oculto");
      mostrarTerminou();
    } else {
      mostrarMoeda();
    }
    iniciarTimer(msg.tempoLimiteMs);
  }

  // resultadoClassificacaoItem { itemIndex, correto }
  function resultadoItem(msg) {
    const r = respostas.get(msg.itemIndex) || {};
    r.correto = msg.correto;
    respostas.set(msg.itemIndex, r);
    if (r.categoria) mostrarFeedback(r.categoria, msg.correto);
    atual = msg.itemIndex + 1;
    if (atual >= itens.length) setTimeout(mostrarTerminou, 500);
    else setTimeout(mostrarMoeda, 260);
    atualizarBolinhas();
  }

  // resultadoSorting { categoriaA, categoriaB, pontosGanhos, corretos, totalItens,
  // gabarito: [{ nome, categoria }], minhasRespostas: [{ nome, escolhida, correto }] }.
  // As respostas vêm do servidor, então o gabarito sai certo mesmo para quem
  // acabou de reconectar.
  function mostrarResultado(msg) {
    parar();
    $("sorting-pontos").textContent = `+${msg.pontosGanhos} pts`;
    $("sorting-acertos").textContent = `Você acertou ${msg.corretos} de ${msg.totalItens}`;
    $("gab-titulo-a").textContent = msg.categoriaA;
    $("gab-titulo-b").textContent = msg.categoriaB;
    const minhas = new Map((msg.minhasRespostas || []).map((r) => [r.nome, r]));
    const ulA = $("gab-a"), ulB = $("gab-b");
    ulA.replaceChildren();
    ulB.replaceChildren();
    for (const item of msg.gabarito) {
      const r = minhas.get(item.nome);
      const estado = !r || r.escolhida === null ? "" : r.correto ? "certo" : "errado";
      const li = criarEl("li", estado);
      li.append(criarEl("span", "", estado === "certo" ? "✅" : estado === "errado" ? "❌" : "➖"), criarEl("span", "n", item.nome));
      (item.categoria === "A" ? ulA : ulB).append(li);
    }
  }

  function parar() {
    clearInterval(intervaloTimer);
  }

  return { montar, resultadoItem, mostrarResultado, parar };
})();

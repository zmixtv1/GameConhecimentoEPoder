// Celular: desafio de Ligação, durante e resultado.
// Referência: controle_ligacao.html.
//
// As duas colunas ficam lado a lado. Toque num item e depois num do outro
// lado, ou arraste de um até o outro: uma linha acompanha o dedo. Certo, os
// dois ficam com a mesma cor e uma linha fixa os liga; errado, a linha pisca
// vermelho e os dois tremem. Quem confere é o servidor (tentarPar).
window.CelularLigacao = (() => {
  const $ = (id) => document.getElementById(id);
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Uma cor por par ligado, para as linhas não se confundirem
  const CORES_PARES = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#ef4444", "#64748b"];
  // ao voltar de uma queda o servidor diz quais pares já estavam certos, mas
  // não qual direita foi com qual esquerda: esses ficam em cinza, sem linha
  const COR_SEM_LINHA = "#94a3b8";

  const tela = $("tela-linking");
  const ligarEl = $("ligar");
  const colEsq = $("coluna-esquerda");
  const colDir = $("coluna-direita");
  const svg = $("linhas");

  let enviar = () => {};
  let intervaloTimer = null;

  let esquerdaTextos = [];
  let direitaTextos = [];
  let totalPares = 0;
  let pares = []; // [{ e, d, cor }] pares ligados (com linha)
  let corretosSemLinha = new Set(); // reconexão: esquerda já certa, sem saber a direita
  let direitaUsada = new Set();
  let selecionado = null; // { lado: "e" | "d", i }
  let pendente = null; // { e, d } esperando o servidor
  let completou = false;

  function criarEl(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  const itemEl = (lado, i) => (lado === "e" ? colEsq : colDir).children[i];

  // ---------- Timer ----------
  const CIRC = 326.7;
  function iniciarTimer(ms) {
    clearInterval(intervaloTimer);
    const anel = $("anel-linking"), numero = $("numero-linking"), modulo = $("timer-linking");
    const inicio = Date.now();
    const atualizar = () => {
      const dec = Date.now() - inicio;
      const resta = Math.max(0, ms - dec);
      anel.style.strokeDashoffset = String(CIRC * Math.min(1, dec / ms));
      const s = Math.ceil(resta / 1000);
      numero.textContent = String(s);
      modulo.classList.toggle("urgente", s <= 5 && s > 0 && !completou);
      if (resta <= 0) clearInterval(intervaloTimer);
    };
    atualizar();
    intervaloTimer = setInterval(atualizar, 100);
  }

  // ---------- Montagem ----------
  function montarColunas() {
    colEsq.replaceChildren();
    colDir.replaceChildren();
    esquerdaTextos.forEach((t, i) => colEsq.append(criarItem("e", i, t)));
    direitaTextos.forEach((t, i) => colDir.append(criarItem("d", i, t)));
    atualizarProgresso();
  }

  function criarItem(lado, i, texto) {
    const b = criarEl("button", "item");
    b.type = "button";
    b.dataset.lado = lado;
    b.dataset.i = String(i);
    b.style.animationDelay = `${i * 50 + (lado === "d" ? 120 : 0)}ms`;
    b.append(criarEl("span", "check", "✓"), document.createTextNode(texto));
    b.addEventListener("pointerdown", comecarToque);
    return b;
  }

  function atualizarProgresso() {
    const feitos = pares.length + corretosSemLinha.size;
    $("linking-progresso").replaceChildren(
      ...Array.from({ length: totalPares }, (_, k) => criarEl("i", k < feitos ? "ok" : ""))
    );
    $("linking-titulo").textContent = completou ? "Tudo ligado!" : "Ligue os pares";
  }

  const estaLigado = (lado, i) =>
    lado === "e"
      ? pares.some((p) => p.e === i) || corretosSemLinha.has(i)
      : pares.some((p) => p.d === i) || direitaUsada.has(i);

  // ---------- Seleção por toque ----------
  function limparSelecao() {
    if (selecionado) itemEl(selecionado.lado, selecionado.i)?.classList.remove("selecionado");
    selecionado = null;
  }

  function tocar(lado, i) {
    if (pendente || completou || estaLigado(lado, i)) return;
    if (selecionado && selecionado.lado === lado && selecionado.i === i) { limparSelecao(); return; }
    if (selecionado && selecionado.lado !== lado) {
      const e = lado === "e" ? i : selecionado.i;
      const d = lado === "d" ? i : selecionado.i;
      limparSelecao();
      tentarPar(e, d);
      return;
    }
    limparSelecao();
    selecionado = { lado, i };
    itemEl(lado, i).classList.add("selecionado");
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function tentarPar(e, d) {
    pendente = { e, d };
    itemEl("e", e).classList.add("aguardando");
    itemEl("d", d).classList.add("aguardando");
    desenharTemporaria(itemEl("e", e), itemEl("d", d));
    enviar(e, d);
  }

  // ---------- Arrastar ----------
  let arrasto = null; // { lado, i, x0, y0, moveu }

  function comecarToque(ev) {
    const b = ev.currentTarget;
    const lado = b.dataset.lado, i = Number(b.dataset.i);
    if (pendente || completou || estaLigado(lado, i)) return;
    ev.preventDefault();
    arrasto = { lado, i, x0: ev.clientX, y0: ev.clientY, moveu: false };
    window.addEventListener("pointermove", moverToque);
    window.addEventListener("pointerup", soltarToque, { once: true });
    window.addEventListener("pointercancel", cancelarToque, { once: true });
  }

  function moverToque(ev) {
    if (!arrasto) return;
    if (!arrasto.moveu && Math.hypot(ev.clientX - arrasto.x0, ev.clientY - arrasto.y0) < 10) return;
    if (!arrasto.moveu) {
      arrasto.moveu = true;
      limparSelecao();
      selecionado = { lado: arrasto.lado, i: arrasto.i };
      itemEl(arrasto.lado, arrasto.i).classList.add("selecionado");
    }
    desenharTemporaria(itemEl(arrasto.lado, arrasto.i), { x: ev.clientX, y: ev.clientY });
  }

  function soltarToque(ev) {
    window.removeEventListener("pointermove", moverToque);
    window.removeEventListener("pointercancel", cancelarToque);
    const a = arrasto;
    arrasto = null;
    if (!a) return;
    if (!a.moveu) { tocar(a.lado, a.i); return; }

    limparTemporaria();
    const alvo = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("#tela-linking .item");
    if (alvo && alvo.dataset.lado !== a.lado && !estaLigado(alvo.dataset.lado, Number(alvo.dataset.i))) {
      const j = Number(alvo.dataset.i);
      limparSelecao();
      tentarPar(a.lado === "e" ? a.i : j, a.lado === "d" ? a.i : j);
    }
    // Soltou fora: o item continua selecionado, dá para completar com um toque
  }

  function cancelarToque() {
    window.removeEventListener("pointermove", moverToque);
    window.removeEventListener("pointerup", soltarToque);
    arrasto = null;
    limparTemporaria();
  }

  // ---------- Linhas ----------
  function pontoBorda(el) {
    const base = ligarEl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = el.dataset.lado === "e" ? r.right : r.left;
    return { x: x - base.left, y: r.top + r.height / 2 - base.top };
  }

  function caminho(a, b) {
    const dx = Math.max(24, Math.abs(b.x - a.x) * 0.5);
    const s = b.x >= a.x ? 1 : -1;
    return `M${a.x} ${a.y} C${a.x + dx * s} ${a.y}, ${b.x - dx * s} ${b.y}, ${b.x} ${b.y}`;
  }

  function novoPath(classe, d, cor) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("class", classe);
    p.setAttribute("d", d);
    if (cor) p.setAttribute("stroke", cor);
    svg.append(p);
    return p;
  }

  function limparTemporaria() { svg.querySelectorAll(".temporaria").forEach((p) => p.remove()); }

  function desenharTemporaria(deEl, para) {
    limparTemporaria();
    const a = pontoBorda(deEl);
    let b;
    if (para instanceof Element) b = pontoBorda(para);
    else { const base = ligarEl.getBoundingClientRect(); b = { x: para.x - base.left, y: para.y - base.top }; }
    const de = deEl.dataset.lado === "e" ? a : b, ate = deEl.dataset.lado === "e" ? b : a;
    novoPath("temporaria", caminho(de, ate));
  }

  function desenharFixa(par, animar) {
    const p = novoPath(animar ? "fixa" : "", caminho(pontoBorda(itemEl("e", par.e)), pontoBorda(itemEl("d", par.d))), par.cor);
    p.dataset.par = `${par.e}-${par.d}`;
    if (animar) p.style.setProperty("--len", String(Math.ceil(p.getTotalLength())));
  }

  function redesenharTudo() {
    if (tela.classList.contains("oculto")) return;
    svg.replaceChildren();
    pares.forEach((par) => desenharFixa(par, false));
  }

  function marcarLigado(par) {
    for (const [lado, i] of [["e", par.e], ["d", par.d]]) {
      const el = itemEl(lado, i);
      el.classList.remove("aguardando", "selecionado");
      el.classList.add("ligado");
      el.style.setProperty("--cor-par", par.cor);
    }
  }

  function mostrarTerminou() {
    if (ligarEl.querySelector(".terminou")) return;
    const t = criarEl("div", "terminou");
    t.append(criarEl("span", "grande", "🎉"), criarEl("b", "", "Tudo ligado!"), criarEl("small", "", "Aguardando os outros jogadores…"));
    ligarEl.append(t);
  }

  window.addEventListener("resize", () => requestAnimationFrame(redesenharTudo));

  // ---------- Mensagens do servidor ----------

  // iniciarLinking { tema, esquerda, direita, tempoLimiteMs } e, ao voltar de
  // uma queda, também { corretos, direitaUsada, completou }.
  // aoTentar(esquerdaIndex, direitaIndex). A tela já tem que estar visível.
  function montar(msg, aoTentar) {
    enviar = aoTentar;
    cancelarToque();
    $("linking-tema").textContent = msg.tema;
    esquerdaTextos = msg.esquerda;
    direitaTextos = msg.direita;
    totalPares = msg.esquerda.length;
    pares = [];
    corretosSemLinha = new Set(msg.corretos || []);
    direitaUsada = new Set(msg.direitaUsada || []);
    selecionado = null;
    pendente = null;
    completou = !!msg.completou;
    ligarEl.querySelector(".terminou")?.remove();
    svg.replaceChildren();
    montarColunas();
    corretosSemLinha.forEach((i) => { const el = itemEl("e", i); el.classList.add("ligado"); el.style.setProperty("--cor-par", COR_SEM_LINHA); });
    direitaUsada.forEach((i) => { const el = itemEl("d", i); el.classList.add("ligado"); el.style.setProperty("--cor-par", COR_SEM_LINHA); });
    if (completou) mostrarTerminou();
    iniciarTimer(msg.tempoLimiteMs);
  }

  // resultadoTentativaPar { esquerdaIndex, direitaIndex, correto, completou }
  function resultadoTentativa(msg) {
    const e = msg.esquerdaIndex, d = msg.direitaIndex;
    const elE = itemEl("e", e), elD = itemEl("d", d);
    if (!elE || !elD) return;
    pendente = null;
    limparTemporaria();
    if (msg.correto) {
      const par = { e, d, cor: CORES_PARES[pares.length % CORES_PARES.length] };
      pares.push(par);
      direitaUsada.add(d);
      marcarLigado(par);
      desenharFixa(par, true);
      if (navigator.vibrate) navigator.vibrate(25);
      if (msg.completou) { completou = true; setTimeout(mostrarTerminou, 450); }
    } else {
      [elE, elD].forEach((el) => {
        el.classList.remove("aguardando", "selecionado");
        el.classList.add("errou");
        setTimeout(() => el.classList.remove("errou"), 450);
      });
      novoPath("erro", caminho(pontoBorda(elE), pontoBorda(elD)));
      setTimeout(() => svg.querySelectorAll(".erro").forEach((p) => p.remove()), 520);
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    }
    atualizarProgresso();
  }

  // resultadoLinking { pontosGanhos, paresCorretos, totalPares, pares, corretos }.
  // `corretos` (as esquerdas que ESTE jogador ligou) vem do servidor, então
  // o gabarito sai certo mesmo para quem acabou de reconectar.
  function mostrarResultado(msg) {
    parar();
    $("linking-pontos").textContent = `+${msg.pontosGanhos} pts`;
    $("linking-pares-sub").textContent = `Você ligou ${msg.paresCorretos} de ${msg.totalPares} pares`;
    const meus = new Set(msg.corretos || [...pares.map((p) => p.e), ...corretosSemLinha]);
    $("linking-gabarito").replaceChildren(
      ...msg.pares.map((par, i) => {
        const meu = meus.has(i);
        const li = criarEl("li", meu ? "meu" : "");
        li.append(
          criarEl("span", "marca", meu ? "✅" : "➖"),
          criarEl("span", "esq", par.esquerda),
          criarEl("span", "seta", "→"),
          criarEl("span", "dir", par.direita)
        );
        return li;
      })
    );
  }

  function parar() {
    clearInterval(intervaloTimer);
    cancelarToque();
  }

  return { montar, resultadoTentativa, mostrarResultado, parar };
})();

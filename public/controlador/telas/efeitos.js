// Os efeitos dos poderes nas alternativas, no celular de quem foi atacado.
// Os poderes valem só na pergunta em que foram usados.
//
// Congelamento: um bloco de gelo em cada alternativa. 2 toques derretem o
//   bloco (+1 toque por ataque acumulado) e o toque seguinte responde. O 1º
//   toque abre um buraco onde o dedo encostou; o último faz o buraco crescer
//   até cobrir tudo. Durante as animações (450ms e 750ms) os toques não contam.
//   Referência: teste/teste-gelo.html.
// Névoa: o texto fica borrado e clareia sozinho em 5s (+1s por ataque
//   acumulado). O borrão não aumenta com o acúmulo, só dura mais. Dá para
//   chutar no borrão a qualquer momento. Referência: teste/teste-nevoa.html.
// Mordicadores: 20% das letras somem por ataque (máximo 70%), sorteadas uma
//   vez só quando as alternativas aparecem.
window.EfeitosPergunta = (() => {
  const TOQUES_BASE_GELO = 2;
  const DURACAO_BURACO_MS = 450;
  const DURACAO_DERRETER_MS = 750;
  const BORDA_SUAVE = 14; // px de borda macia em volta do buraco
  const FLOCOS = ["❄", "❅", "❆"];

  const NEVOA_BASE_MS = 5000;
  const NEVOA_POR_ATAQUE_MS = 1000;
  const NEVOA_ATRASO_MS = 400; // parada no máximo antes de começar a clarear
  const BLUR_MAX = 5; // dá para ver o formato da palavra, mas é difícil ler

  const rand = (a, b) => a + Math.random() * (b - a);
  const contar = (efeitos, tipo) => efeitos.filter((e) => e.tipo === tipo).length;

  let gelos = new WeakMap(); // botão -> { el, toques, necessarios, buracos, ocupado }
  let botoes = [];
  let camadaNeve = null;
  let nevoa = null; // { inicio, duracao, quadro }
  let bonus = null; // { el, inicio, restanteMs, totalMs, max, intervalo, travado }

  // ---------- Mordicadores ----------

  function morder(texto, ataques) {
    if (ataques <= 0) return texto;
    const fracao = Math.min(0.7, ataques * 0.2);
    return texto
      .split("")
      .map((ch) => (/[a-zA-ZÀ-ÿ]/.test(ch) && Math.random() < fracao ? "▒" : ch))
      .join("");
  }

  // ---------- Congelamento ----------

  function congelar(btn, necessarios) {
    const el = document.createElement("div");
    el.className = "gelo";
    const dica = document.createElement("span");
    dica.className = "gelo-dica";
    dica.textContent = `❄ Toque ${necessarios}x para derreter`;
    el.append(dica);
    btn.append(el);
    gelos.set(btn, { el, dica, toques: 0, necessarios, buracos: [], ocupado: false });
  }

  // máscara com vários buracos redondos de borda macia (interseção de gradientes)
  function aplicarMascara(el, buracos) {
    const m = buracos
      .map((h) => `radial-gradient(circle at ${h.x}px ${h.y}px, transparent ${h.r}px, #000 ${h.r + BORDA_SUAVE}px)`)
      .join(", ");
    el.style.webkitMaskImage = m;
    el.style.maskImage = m;
    el.style.webkitMaskComposite = buracos.map(() => "source-in").join(", ");
    el.style.maskComposite = buracos.map(() => "intersect").join(", ");
  }

  // um floco nasce na borda do gelo, é soprado para fora e cai balançando
  function soltarFloco(r, lx, ly, ang) {
    if (!camadaNeve) {
      camadaNeve = document.createElement("div");
      camadaNeve.className = "camada-neve";
      document.body.append(camadaNeve);
    }
    const f = document.createElement("div");
    f.className = "floco-neve";
    f.textContent = FLOCOS[Math.floor(Math.random() * FLOCOS.length)];
    f.style.fontSize = `${rand(9, 18)}px`;
    const sx = r.left + lx;
    const sy = r.top + ly;
    const queda = innerHeight - sy + 30;
    const dur = rand(1600, 2800) * Math.max(0.6, queda / 300);
    const sopro = rand(10, 35);
    const bx = Math.cos(ang) * sopro, by = Math.sin(ang) * sopro - rand(5, 20);
    const amp = rand(8, 22), ondas = rand(1.2, 2.6), deriva = rand(-30, 30), giro = rand(-240, 240);
    const frames = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const solta = Math.min(1, t / 0.18); // primeiro se solta do gelo...
      const cai = Math.max(0, (t - 0.1) / 0.9); // ...depois cai com a gravidade
      const xx = bx * solta + deriva * cai + Math.sin(cai * Math.PI * 2 * ondas) * amp;
      const yy = by * solta + queda * (cai * cai * 0.4 + cai * 0.6);
      frames.push({
        transform: `translate(${sx + xx}px, ${sy + yy}px) rotate(${giro * t}deg) scale(${0.4 + 0.6 * solta})`,
        opacity: t < 0.08 ? t / 0.08 : t > 0.8 ? (1 - t) / 0.2 : 1,
      });
    }
    camadaNeve.append(f);
    f.animate(frames, { duration: dur, easing: "linear", fill: "both" }).onfinish = () => f.remove();
  }

  // faz o buraco crescer e solta flocos ao longo da borda que está derretendo
  function dissolver(g, r, x, y, raioFinal, duracao, densidade, fim) {
    g.ocupado = true;
    const buraco = { x, y, r: 0 };
    g.buracos.push(buraco);
    const t0 = performance.now();
    let anterior = 0;
    const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function quadro(agora) {
      if (!g.el.isConnected) return;
      const t = Math.min(1, (agora - t0) / duracao);
      const e = 1 - Math.pow(1 - t, 3);
      buraco.r = raioFinal * e;
      aplicarMascara(g.el, g.buracos);
      const crescimento = buraco.r - anterior;
      anterior = buraco.r;
      const qtd = semMovimento ? 0 : Math.round(crescimento * densidade * (0.4 + buraco.r / 60) * 0.35 + Math.random() * 0.6);
      for (let i = 0; i < qtd; i++) {
        const a = rand(0, Math.PI * 2);
        const px = x + Math.cos(a) * buraco.r;
        const py = y + Math.sin(a) * buraco.r;
        if (px < 0 || py < 0 || px > r.width || py > r.height) continue;
        soltarFloco(r, px, py, a);
      }
      if (t < 1) requestAnimationFrame(quadro);
      else {
        g.ocupado = false;
        fim();
      }
    }
    requestAnimationFrame(quadro);
  }

  // Toque numa alternativa. Devolve true se o toque foi para o gelo (e então
  // não responde); false quando a alternativa já está livre.
  function tocarGelo(btn, evento) {
    const g = gelos.get(btn);
    if (!g) return false;
    if (g.ocupado) return true;

    const r = g.el.getBoundingClientRect();
    const x = evento && evento.clientX ? evento.clientX - r.left : r.width / 2;
    const y = evento && evento.clientY ? evento.clientY - r.top : r.height / 2;
    g.toques++;
    g.dica.style.opacity = "0";

    if (g.toques < g.necessarios) {
      // buraco médio, e o resto do gelo fica um pouco mais fino
      dissolver(g, r, x, y, rand(34, 42), DURACAO_BURACO_MS, 1.2, () => {});
      g.el.style.opacity = String(Math.max(0.55, 1 - 0.18 * g.toques));
    } else {
      // cresce até cobrir o bloco inteiro e some
      const raio = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) + BORDA_SUAVE;
      dissolver(g, r, x, y, raio, DURACAO_DERRETER_MS, 2.2, () => {
        g.el.remove();
        gelos.delete(btn);
      });
    }
    if (navigator.vibrate) navigator.vibrate(15);
    return true;
  }

  // ---------- Névoa ----------

  // quanto de névoa ainda resta: 1 = tudo borrado, 0 = limpo
  function nevoaRestante(agora = performance.now()) {
    if (!nevoa) return 0;
    const t = Math.min(1, Math.max(0, (agora - nevoa.inicio - NEVOA_ATRASO_MS) / (nevoa.duracao - NEVOA_ATRASO_MS)));
    return 1 - t * t * (3 - 2 * t); // clareia devagar no começo e mais rápido no fim
  }

  function pintarNevoa(btn, n) {
    btn.style.setProperty("--blur", `${(BLUR_MAX * n).toFixed(2)}px`);
    btn.style.setProperty("--halo", n.toFixed(3));
    btn.style.setProperty("--borda", n.toFixed(3));
    btn.style.setProperty("--dica", Math.max(0, (n - 0.45) / 0.55).toFixed(3));
  }

  function borrar(ataques) {
    nevoa = { inicio: performance.now(), duracao: NEVOA_BASE_MS + (ataques - 1) * NEVOA_POR_ATAQUE_MS, quadro: null };
    for (const btn of botoes) {
      btn.classList.add("com-nevoa");
      const dica = document.createElement("span");
      dica.className = "dica-nevoa";
      dica.textContent = "🌫️ Chute agora ou espere clarear";
      btn.append(dica);
      pintarNevoa(btn, 1);
    }
    const passo = (agora) => {
      if (!nevoa) return;
      const n = nevoaRestante(agora);
      for (const btn of botoes) if (!btn.classList.contains("selecionada")) pintarNevoa(btn, n);
      if (n > 0) nevoa.quadro = requestAnimationFrame(passo);
    };
    nevoa.quadro = requestAnimationFrame(passo);
  }

  // revela rapidinho a alternativa escolhida (o jogador vê o que chutou)
  function desborrar(btn) {
    const de = nevoaRestante();
    if (de <= 0) return;
    const t0 = performance.now();
    (function passo(agora) {
      const t = Math.min(1, (agora - t0) / 400);
      pintarNevoa(btn, de * (1 - t));
      if (t < 1) requestAnimationFrame(passo);
    })(t0);
  }

  // ---------- bônus de velocidade (só aparece com Névoa) ----------

  function valorBonus() {
    const restante = Math.max(0, bonus.restanteMs - (Date.now() - bonus.inicio));
    return Math.round(bonus.max * (restante / bonus.totalMs));
  }

  function mostrarBonus(el, { tempoLimiteMs, tempoTotalMs, bonusMax }) {
    bonus = { el, inicio: Date.now(), restanteMs: tempoLimiteMs, totalMs: tempoTotalMs || tempoLimiteMs, max: bonusMax, intervalo: null };
    el.classList.remove("oculto", "travado", "zero");
    const atualizar = () => {
      const v = valorBonus();
      el.textContent = `⚡+${v}`;
      el.classList.toggle("zero", v === 0);
      if (v === 0) clearInterval(bonus.intervalo);
    };
    atualizar();
    bonus.intervalo = setInterval(atualizar, 100);
  }

  // ---------- entrada ----------

  // botoes: os 4 botões das alternativas (já com o texto mordido, se for o caso).
  // efeitos: [{ tipo, deId, deNome }] que vieram no iniciarResposta.
  function montar({ botoes: lista, efeitos, tempoLimiteMs, tempoTotalMs, bonusMax, bonusEl }) {
    parar();
    botoes = lista;
    const gelo = contar(efeitos, "congelamento");
    const nevoas = contar(efeitos, "nevoa");
    if (gelo > 0) botoes.forEach((b) => congelar(b, TOQUES_BASE_GELO + gelo - 1));
    if (nevoas > 0) {
      borrar(nevoas);
      if (bonusEl && bonusMax) mostrarBonus(bonusEl, { tempoLimiteMs, tempoTotalMs, bonusMax });
    }
  }

  // o jogador respondeu: o bônus para no valor do toque e a escolhida desembaça
  function travarResposta(btn) {
    if (bonus) {
      clearInterval(bonus.intervalo);
      bonus.el.textContent = `⚡+${valorBonus()}`;
      bonus.el.classList.remove("zero");
      bonus.el.classList.add("travado");
    }
    if (nevoa) desborrar(btn);
  }

  // a TV revelou a resposta: tira gelo e névoa para todo mundo ver a certa
  function revelar() {
    for (const btn of botoes) {
      const g = gelos.get(btn);
      if (g) {
        g.el.classList.add("sumindo");
        setTimeout(() => g.el.remove(), 450);
      }
      pintarNevoa(btn, 0);
      btn.querySelectorAll(".dica-nevoa").forEach((d) => d.remove());
    }
    gelos = new WeakMap();
    if (nevoa) cancelAnimationFrame(nevoa.quadro);
    nevoa = null;
    if (bonus) clearInterval(bonus.intervalo);
  }

  function parar() {
    if (nevoa) cancelAnimationFrame(nevoa.quadro);
    nevoa = null;
    if (bonus) {
      clearInterval(bonus.intervalo);
      bonus.el.classList.add("oculto");
    }
    bonus = null;
    gelos = new WeakMap();
    botoes = [];
  }

  return { morder, montar, tocarGelo, travarResposta, revelar, parar };
})();

// Pódio final na TV. Sequência: o 3º sobe, o 2º sobe, rufar, o campeão sobe
// com coroa e confete, e só então o 4º em diante. A classificação vem pronta
// do servidor: 1º é quem chegou ao topo, depois o andar alcançado, e os
// pontos só desempatam quem parou junto. Referência: teste/teste-podio.html.
window.TelaPodio = (() => {
  const T = { terceiro: 900, segundo: 2300, rufar: 3600, campeao: 4500, restantes: 5800 };
  const CORES = ["#f5b301", "#ff4757", "#1e90ff", "#2ed573", "#9b59b6", "#ff7f50", "#00d2d3", "#ffffff"];

  let timers = [];
  const depois = (ms, fn) => timers.push(setTimeout(fn, ms));

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // ---------- confete (canvas, igual ao protótipo) ----------
  let canvas = null;
  let ctx = null;
  let pecas = [];
  let animando = null;
  let chuvaAte = 0;

  function ajustarCanvas() {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function novaPeca(x, y, vx, vy) {
    return {
      x, y, vx, vy,
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      giro: Math.random() * Math.PI * 2,
      cor: CORES[Math.floor(Math.random() * CORES.length)],
    };
  }

  function soltarConfete() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ajustarCanvas();
    // duas explosões de canhão nos cantos de baixo
    for (let i = 0; i < 140; i++) {
      const esq = i % 2 === 0;
      const ang = ((esq ? -60 : -120) * Math.PI) / 180 + (Math.random() - 0.5) * 0.7;
      const v = 12 + Math.random() * 10;
      pecas.push(novaPeca(esq ? -10 : innerWidth + 10, innerHeight * 0.9, Math.cos(ang) * v, Math.sin(ang) * v));
    }
    chuvaAte = performance.now() + 6000;
    if (!animando) animando = requestAnimationFrame(quadro);
  }

  function quadro(agora) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (agora < chuvaAte && Math.random() < 0.5) {
      pecas.push(novaPeca(Math.random() * innerWidth, -12, (Math.random() - 0.5) * 2, 1 + Math.random() * 2));
    }
    pecas = pecas.filter((p) => p.y < innerHeight + 30);
    for (const p of pecas) {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.32;
      p.x += p.vx + Math.sin(p.giro) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      p.giro += 0.08;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.giro)); // papel virando
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (pecas.length || agora < chuvaAte) animando = requestAnimationFrame(quadro);
    else {
      animando = null;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  function pararConfete() {
    pecas = [];
    chuvaAte = 0;
    if (animando) cancelAnimationFrame(animando);
    animando = null;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ---------- montagem ----------

  // payload: fimDePartida { classificacao, totalAndares }
  function montar(payload) {
    parar();
    canvas = document.getElementById("pd-confete");
    ctx = canvas.getContext("2d");

    const TOPO = payload.totalAndares;
    const corrida = payload.classificacao || [];
    const campeao = corrida[0];
    const nomeAndar = (n) => (n <= 0 ? "chão" : n >= TOPO ? "topo" : `andar ${n}`);
    const ondeParou = (j) => (j.andarFinal >= TOPO ? "Chegou ao topo 🏆" : `Parou no andar ${j.andarFinal}`);
    const bicho = (j) => (j.avatar ? j.avatar.emoji : "❔");

    // empatou no andar com alguém e foi decidido nos pontos?
    function desempateCom(i) {
      const j = corrida[i];
      const vizinho = [corrida[i - 1], corrida[i + 1]].find((o) => o && o.andarFinal === j.andarFinal);
      if (!vizinho || j.andarFinal >= TOPO) return null;
      const dif = Math.abs(j.pontos - vizinho.pontos);
      return j.pontos >= vizinho.pontos ? `Desempate: +${dif} pts` : `Desempate: −${dif} pts`;
    }

    const rotulo = document.getElementById("pd-rotulo");
    const titulo = document.getElementById("pd-titulo");
    const subtitulo = document.getElementById("pd-subtitulo");
    rotulo.textContent = "Fim de jogo";
    titulo.classList.remove("revelado");
    titulo.textContent = "E o campeão é…";
    subtitulo.textContent = "Quem chega ao topo da Pirâmide primeiro vence";

    // pódio na ordem visual: 2º, 1º, 3º
    const podio = document.getElementById("pd-podio");
    podio.replaceChildren();
    const degraus = {};
    [[1, "segundo"], [0, "primeiro"], [2, "terceiro"]].forEach(([i, classe]) => {
      const j = corrida[i];
      if (!j) return;
      const d = el("div", `degrau ${classe}`);
      const b = el("div", "bicho", bicho(j));
      if (i === 0) {
        b.prepend(el("span", "raios"));
        b.append(el("span", "coroa", "👑"));
      }
      const bloco = el("div", "bloco");
      bloco.append(el("span", "posicao", `${i + 1}º`), el("span", "detalhe", ondeParou(j)));
      const dsp = desempateCom(i);
      if (dsp) bloco.append(el("span", "desempate", dsp));
      d.append(b, el("div", "nome", j.nome), bloco);
      podio.append(d);
      degraus[i] = d;
    });

    const restantes = document.getElementById("pd-restantes");
    restantes.replaceChildren();
    corrida.slice(3).forEach((j, k) => {
      const li = el("li", "glass-panel");
      const info = el("span", "info");
      info.append(el("span", "nome", j.nome), el("span", "onde", `${k + 4}º · ${nomeAndar(j.andarFinal)}`));
      li.append(el("span", "bicho-mini", bicho(j)), info);
      restantes.append(li);
    });

    const revelar = (d) => { if (d) d.classList.add("subiu", "revelado"); };
    depois(T.terceiro, () => revelar(degraus[2]));
    depois(T.segundo, () => revelar(degraus[1]));
    depois(T.rufar, () => {
      subtitulo.textContent = "🥁 …";
      if (degraus[0]) degraus[0].classList.add("subiu");
    });
    depois(T.campeao, () => {
      if (!campeao) return;
      if (degraus[0]) degraus[0].classList.add("revelado", "festa");
      titulo.replaceChildren(`${bicho(campeao)} `, el("span", "nome-campeao", campeao.nome), " venceu!");
      void titulo.offsetWidth;
      titulo.classList.add("revelado");
      rotulo.textContent = "Campeão da Pirâmide";
      const subiu = TOPO - campeao.largada;
      subtitulo.textContent = `Largou no ${nomeAndar(campeao.largada)} e subiu ${subiu} ${subiu === 1 ? "andar" : "andares"} até o topo`;
      soltarConfete();
    });
    depois(T.restantes, () => {
      [...restantes.children].forEach((li, k) => depois(k * 90, () => li.classList.add("visivel")));
    });
  }

  function parar() {
    timers.forEach(clearTimeout);
    timers = [];
    pararConfete();
  }

  window.addEventListener("resize", ajustarCanvas);
  return { montar, parar };
})();

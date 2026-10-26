// Fim de jogo no celular. A classificação vem pronta do servidor (topo vence,
// depois o andar alcançado, e os pontos só desempatam), igual à da TV.
// Referência: teste/teste-podio-celular.html.
window.CelularFim = (() => {
  const CORES = ["#f5b301", "#ff4757", "#1e90ff", "#2ed573", "#9b59b6", "#ff7f50", "#00d2d3"];

  const $ = (id) => document.getElementById(id);
  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  let timers = [];
  const depois = (ms, fn) => timers.push(setTimeout(fn, ms));

  // msg: fimDePartida { classificacao, totalAndares }
  // souAnfitriao: só o anfitrião leva a sala de volta pro início
  function montar(msg, { meuId, souAnfitriao, aoJogarDeNovo }) {
    parar();
    const TOPO = msg.totalAndares;
    const corrida = msg.classificacao || [];
    const campeao = corrida[0];
    const eu = corrida.find((j) => j.id === meuId) || null;
    const porPontos = [...corrida].sort((a, b) => b.pontos - a.pontos);
    const nomeAndar = (n) => (n <= 0 ? "chão" : n >= TOPO ? "topo" : `andar ${n}`);
    const bicho = (j) => (j.avatar ? j.avatar.emoji : "❔");

    $("fim-minha-posicao").textContent = eu ? `${eu.colocacao}º` : "–";

    // ---- título e explicação ----
    const titulo = $("fim-titulo");
    const explica = $("fim-explica");
    if (campeao) {
      const euVenci = eu && eu.id === campeao.id;
      titulo.replaceChildren(
        euVenci ? "🏆 Você venceu, " : `${bicho(campeao)} `,
        el("span", "campeao", campeao.nome),
        euVenci ? "!" : " venceu!"
      );
      // empate em pontos conta como o mesmo lugar
      const lugarEmPontos = porPontos.filter((j) => j.pontos > campeao.pontos).length + 1;
      if (lugarEmPontos > 1) {
        explica.replaceChildren(
          el("b", "", "🔄 Virada! "),
          `Era ${lugarEmPontos}º em pontos, largou no ${nomeAndar(campeao.largada)} e chegou ao topo primeiro.`
        );
      } else {
        explica.replaceChildren(el("b", "", "💪 "), "Liderou nos pontos e confirmou no topo da Pirâmide.");
      }
    } else {
      titulo.textContent = "Fim de partida!";
      explica.textContent = "";
    }

    // ---- pódio (2º, 1º, 3º) ----
    const podio = $("fim-podio");
    podio.replaceChildren();
    const degraus = [];
    [[1, "segundo"], [0, "primeiro"], [2, "terceiro"]].forEach(([i, classe]) => {
      const j = corrida[i];
      if (!j) return;
      const ehEu = eu && j.id === eu.id;
      const d = el("div", `fim-degrau ${classe}${ehEu ? " eu" : ""}`);
      const b = el("div", "fim-bicho", bicho(j));
      if (i === 0) b.append(el("span", "fim-coroa", "👑"));
      const bloco = el("div", "fim-bloco");
      bloco.append(
        el("span", "fim-posicao", `${i + 1}º`),
        el("span", "fim-detalhe", j.andarFinal >= TOPO ? "topo 🏆" : nomeAndar(j.andarFinal))
      );
      d.append(b, el("div", "fim-nome", ehEu ? "Você" : j.nome), bloco);
      podio.append(d);
      degraus[i] = d;
    });

    // ---- placar das rodadas + caminho na pirâmide ----
    const placar = $("fim-placar-lista");
    placar.replaceChildren();
    porPontos.forEach((j, k) => {
      const ehEu = eu && j.id === eu.id;
      const li = el("li", [campeao && j.id === campeao.id ? "campeao" : "", ehEu ? "eu" : ""].join(" ").trim());
      li.style.animationDelay = `${300 + k * 50}ms`;
      const posicao = porPontos.filter((o) => o.pontos > j.pontos).length + 1;
      const traj = el("span", "fim-trajeto");
      traj.append(
        el("span", "de", j.largada === 0 ? "chão" : String(j.largada)),
        el("span", "seta", "→"),
        el("span", "ate" + (j.andarFinal >= TOPO ? " topo" : ""), j.andarFinal >= TOPO ? "🏆" : String(j.andarFinal))
      );
      li.append(
        el("span", "pos", `${posicao}º`),
        el("span", "bicho-mini", bicho(j)),
        el("span", "nome", ehEu ? `${j.nome} (você)` : j.nome),
        el("span", "pts", String(j.pontos)),
        traj
      );
      placar.append(li);
    });

    // ---- revelação rápida: 3º, 2º, 1º ----
    const euVenci = eu && campeao && eu.id === campeao.id;
    depois(200, () => degraus[2]?.classList.add("revelado"));
    depois(550, () => degraus[1]?.classList.add("revelado"));
    depois(950, () => {
      degraus[0]?.classList.add("revelado");
      soltarConfete(euVenci ? 120 : 50);
      if (euVenci && navigator.vibrate) navigator.vibrate([60, 40, 60]);
    });

    // ---- botão: só o anfitrião reinicia; os outros esperam por ele ----
    document.querySelectorAll("[data-jogar-de-novo]").forEach((b) => {
      b.disabled = !souAnfitriao;
      b.textContent = souAnfitriao ? "↻ Jogar de novo" : "Aguardando o anfitrião…";
      b.onclick = () => {
        document.querySelectorAll("[data-jogar-de-novo]").forEach((x) => {
          x.disabled = true;
          x.textContent = "Voltando para a sala…";
        });
        aoJogarDeNovo();
      };
    });
  }

  // ---------- confete (leve) ----------
  let canvas = null;
  let ctx = null;
  let pecas = [];
  let animando = null;

  function ajustarCanvas() {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function soltarConfete(qtd) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    canvas = $("fim-confete");
    ctx = canvas.getContext("2d");
    ajustarCanvas();
    for (let i = 0; i < qtd; i++) {
      pecas.push({
        x: Math.random() * innerWidth, y: -10 - Math.random() * innerHeight * 0.5,
        vx: (Math.random() - 0.5) * 1.5, vy: 1.5 + Math.random() * 2.5,
        w: 4 + Math.random() * 5, h: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25, giro: Math.random() * 6,
        cor: CORES[Math.floor(Math.random() * CORES.length)],
      });
    }
    if (!animando) animando = requestAnimationFrame(quadro);
  }

  function quadro() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    pecas = pecas.filter((p) => p.y < innerHeight + 20);
    for (const p of pecas) {
      p.vy += 0.03;
      p.x += p.vx + Math.sin(p.giro) * 0.5;
      p.y += p.vy;
      p.rot += p.vr;
      p.giro += 0.07;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.giro));
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    animando = pecas.length ? requestAnimationFrame(quadro) : null;
  }

  function parar() {
    timers.forEach(clearTimeout);
    timers = [];
    pecas = [];
    if (animando) cancelAnimationFrame(animando);
    animando = null;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener("resize", ajustarCanvas);
  return { montar, parar };
})();

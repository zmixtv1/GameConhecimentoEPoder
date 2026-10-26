// Tela "quem atacou quem". Entre a escolha de alvo e a pergunta, a TV mostra
// cada Jogo de Poder usado, um momento por jogador, na ordem que o servidor
// manda (ordem de entrada na sala, com os escudos por último). Referências
// visuais: teste/teste-poderes.html e teste/teste-poderes-festaDePontos.html.
//
// Os efeitos acumulam no alvo: quem leva dois ataques termina a sequência
// visivelmente pior que quem levou um.
window.TelaPoderes = (() => {
  const PODERES = {
    congelamento: { icone: "🧊", nome: "Congelamento", cor: "#00d2d3", classe: "status-congelamento" },
    mordicadores: { icone: "😬", nome: "Mordicadores", cor: "#ff6b81", classe: "status-mordicadores" },
    nevoa: { icone: "🌫️", nome: "Névoa", cor: "#64748b", classe: "status-nevoa" },
    escudo: { icone: "🛡️", nome: "Escudo", cor: "#3498db", classe: "status-escudo" },
    aposta: { icone: "🎲", nome: "Aposta", cor: "#9b59b6", classe: "status-aposta" },
    festa: { icone: "🎉", nome: "Festa de Pontos", cor: "#ff9f43", classe: "status-festa" },
  };
  const CORES_CONFETE = ["#ff4757", "#1e90ff", "#2ed573", "#ffa502", "#9b59b6", "#f1c40f"];

  let token = 0;
  let intervaloConfete = null;

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // Monta o texto do banner sem innerHTML: o nome do jogador nunca vira HTML.
  // `partes` mistura texto e { poder } para o nome colorido do poder.
  function preencherBanner(banner, poder, partes) {
    banner.style.setProperty("--cor-poder", poder.cor);
    banner.replaceChildren(
      ...partes.map((p) =>
        typeof p === "string" ? document.createTextNode(p) : el("span", "nome-poder", `${poder.icone} ${poder.nome}`)
      )
    );
    banner.classList.add("mostrar");
  }

  function sobreporEmoji(pod, emoji, extra) {
    const qtd = pod.querySelectorAll(".status-overlay").length;
    const posicao = qtd === 0 ? "" : qtd === 1 ? " segundo" : " terceiro";
    const o = el("div", `status-overlay${posicao}${extra ? " " + extra : ""}`, emoji);
    pod.appendChild(o);
    return o;
  }

  function pular(pod, poder) {
    pod.style.setProperty("--cor-poder", poder.cor);
    pod.classList.add("usando");
    setTimeout(() => pod.classList.remove("usando"), 420);
  }

  function centro(pod, tela) {
    const r = pod.getBoundingClientRect();
    const t = tela.getBoundingClientRect();
    return { x: r.left - t.left + r.width / 2, y: r.top - t.top + r.height / 2 };
  }

  // O projétil sai do centro de quem atacou e chega no centro do alvo.
  function atirar(tela, de, para, poder, duracao) {
    const p = el("div", "projetil-poder", poder.icone);
    p.style.filter = `drop-shadow(0 0 15px ${poder.cor})`;
    tela.appendChild(p);
    const a = centro(de, tela);
    const b = centro(para, tela);
    const anim = p.animate(
      [
        { transform: `translate(${a.x - 30}px, ${a.y - 30}px) rotate(0deg) scale(1)`, opacity: 1 },
        { transform: `translate(${b.x - 30}px, ${b.y - 30}px) rotate(360deg) scale(1.5)`, opacity: 1 },
      ],
      { duration: duracao, easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" }
    );
    return { p, fim: anim.finished.catch(() => {}), b };
  }

  // Ataque que bate em escudo: perde força, gira e cai para fora da tela.
  function cair(tela, projetil, b, duracao) {
    const altura = tela.getBoundingClientRect().height;
    projetil.animate(
      [
        { transform: `translate(${b.x - 30}px, ${b.y - 30}px) rotate(360deg) scale(1.5)`, opacity: 1 },
        { transform: `translate(${b.x - 10}px, ${altura + 120}px) rotate(760deg) scale(0.8)`, opacity: 0 },
      ],
      { duration: duracao, easing: "cubic-bezier(.55,.085,.68,.53)", fill: "forwards" }
    ).finished.catch(() => {}).then(() => projetil.remove());
  }

  function soltarConfete(tela) {
    clearInterval(intervaloConfete);
    const largura = tela.getBoundingClientRect().width;
    const altura = tela.getBoundingClientRect().height;
    intervaloConfete = setInterval(() => {
      for (let i = 0; i < 6; i++) {
        const c = el("div", "confete");
        const tam = Math.random() * 10 + 10;
        c.style.width = `${tam}px`;
        c.style.height = `${tam}px`;
        c.style.left = `${Math.random() * largura}px`;
        c.style.background = CORES_CONFETE[Math.floor(Math.random() * CORES_CONFETE.length)];
        if (Math.random() > 0.5) c.style.borderRadius = "50%";
        tela.appendChild(c);
        const giro = Math.random() * 360;
        c.animate(
          [
            { transform: `translate3d(0, 0, 0) rotate(${giro}deg)`, opacity: 1 },
            { transform: `translate3d(${Math.random() * 200 - 100}px, ${altura + 60}px, 0) rotate(${giro + 720}deg)`, opacity: 0 },
          ],
          { duration: (Math.random() * 2 + 2.5) * 1000, easing: "cubic-bezier(.37,0,.63,1)" }
        ).onfinish = () => c.remove();
      }
    }, 80);
  }

  function pararConfete() {
    clearInterval(intervaloConfete);
    intervaloConfete = null;
  }

  // ---------- os momentos ----------

  async function momentoAtaque(m, ctx) {
    const { tela, banner, pods, nomes, d } = ctx;
    const poder = PODERES[m.tipo];
    const de = pods.get(m.deId);
    const alvo = pods.get(m.alvoId);
    if (!de || !alvo) return;

    preencherBanner(banner, poder, [`${nomes.get(m.deId)} usou `, { poder }, ` em ${nomes.get(m.alvoId)}!`]);
    pular(de, poder);
    await esperar(d * 0.12);

    const tiro = atirar(tela, de, alvo, poder, d * 0.28);
    await tiro.fim;
    if (ctx.cancelado()) return tiro.p.remove();

    if (m.bloqueado) {
      // o escudo só se revela agora, no impacto
      const escudo = PODERES.escudo;
      alvo.classList.add("impacto");
      setTimeout(() => alvo.classList.remove("impacto"), 320);
      alvo.classList.add(escudo.classe);
      if (!alvo.querySelector(".escudo-revelado")) sobreporEmoji(alvo, escudo.icone, "escudo-revelado");
      preencherBanner(banner, escudo, [`O `, { poder: escudo }, ` de ${nomes.get(m.alvoId)} rebateu!`]);
      cair(tela, tiro.p, tiro.b, d * 0.4);
      return;
    }

    tiro.p.remove();
    alvo.classList.add(poder.classe);
    // a Névoa só borra; os outros ganham o emoji grande por cima
    if (m.tipo !== "nevoa") sobreporEmoji(alvo, poder.icone);
  }

  async function momentoAposta(m, ctx) {
    const { banner, pods, nomes } = ctx;
    const poder = PODERES.aposta;
    const de = pods.get(m.deId);
    if (!de) return;
    // não diz em quem: o alvo está olhando para a TV
    preencherBanner(banner, poder, [`${nomes.get(m.deId)} fez uma `, { poder }, ` secreta!`]);
    pular(de, poder);
    de.classList.add(poder.classe);
    sobreporEmoji(de, poder.icone, "dado");
  }

  async function momentoFesta(m, ctx) {
    const { tela, banner, pods, nomes, d } = ctx;
    const poder = PODERES.festa;
    preencherBanner(banner, poder, [`${nomes.get(m.deId)} ativou `, { poder }, `!`]);
    [...pods.values()].forEach((pod, i) => {
      pod.classList.remove("thinking");
      pod.style.animationDelay = `${i * 0.1}s`;
      pod.classList.add(poder.classe);
    });
    soltarConfete(tela);
    setTimeout(pararConfete, Math.min(d * 0.8, 1800));
  }

  async function momentoEscudo(m, ctx) {
    const { banner, pods, nomes } = ctx;
    const poder = PODERES.escudo;
    const pod = pods.get(m.deId);
    if (!pod) return;
    const nome = nomes.get(m.deId);
    if (m.bloqueios > 0) {
      const ataques = m.bloqueios === 1 ? "1 ataque" : `${m.bloqueios} ataques`;
      preencherBanner(banner, poder, [`O `, { poder }, ` de ${nome} segurou ${ataques}!`]);
    } else {
      preencherBanner(banner, poder, [`${nome} se protegeu com o `, { poder }, ` — ninguém atacou`]);
    }
    pular(pod, poder);
    pod.classList.add(poder.classe);
    if (!pod.querySelector(".escudo-revelado")) sobreporEmoji(pod, poder.icone, "escudo-revelado");
  }

  // ---------- entrada ----------

  // payload: { sequencia, jogadores, duracaoPorPoderMs } (mensagem animacaoPoderes)
  // criarPod: a mesma função que a TV usa no lobby e na pergunta
  async function montar(payload, { tela, banner, dock, criarPod }) {
    const meu = ++token;
    pararConfete();
    tela.querySelectorAll(".projetil-poder, .confete").forEach((e) => e.remove());
    banner.classList.remove("mostrar");
    banner.replaceChildren();

    const pods = new Map();
    const nomes = new Map();
    dock.replaceChildren();
    for (const j of payload.jogadores) {
      const pod = criarPod(j, "");
      pods.set(j.id, pod);
      nomes.set(j.id, j.nome);
      dock.appendChild(pod);
    }

    const ctx = {
      tela, banner, pods, nomes,
      d: payload.duracaoPorPoderMs || 2000,
      cancelado: () => meu !== token,
    };

    await esperar(150); // deixa os pods aparecerem antes do primeiro momento
    for (const m of payload.sequencia) {
      if (ctx.cancelado()) return;
      const inicio = Date.now();
      if (m.tipo === "aposta") await momentoAposta(m, ctx);
      else if (m.tipo === "festa") await momentoFesta(m, ctx);
      else if (m.tipo === "escudo") await momentoEscudo(m, ctx);
      else await momentoAtaque(m, ctx);
      // cada momento ocupa o tempo dele inteiro, nem mais nem menos
      await esperar(Math.max(0, ctx.d - (Date.now() - inicio)));
    }
  }

  function parar() {
    token++;
    pararConfete();
  }

  return { montar, parar, PODERES };
})();

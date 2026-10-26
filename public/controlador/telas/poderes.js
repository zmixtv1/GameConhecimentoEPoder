// Celular: escolha do poder (10s) e escolha do alvo (20s).
// Referências: teste/teste-escolha-poder.html e teste/teste-escolha-alvo.html.
//
// O que é oferecido vem pronto do servidor (os 3 de ataque + 1 especial
// sorteado lá, que não muda se o celular recarregar). Aqui só se desenha e se
// avisa a escolha pelo callback.
window.CelularPoderes = (() => {
  const POR_TIPO = {
    congelamento: { icone: "🧊", nome: "Congelamento", cor: "#38bdf8" },
    mordicadores: { icone: "😬", nome: "Mordicadores", cor: "#f59e0b" },
    nevoa: { icone: "🌫️", nome: "Névoa", cor: "#64748b" },
    escudo: { icone: "🛡️", nome: "Escudo", cor: "#6366f1" },
    aposta: { icone: "🎲", nome: "Aposta", cor: "#10b981", aFavor: true },
    festa: { icone: "🎉", nome: "Festa de Pontos", cor: "#ec4899" },
  };
  const info = (tipo) => POR_TIPO[tipo] || { icone: "❔", nome: tipo, cor: "#94a3b8" };

  const $ = (id) => document.getElementById(id);
  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function corDoPoder(tipo) {
    document.documentElement.style.setProperty("--cor-poder", info(tipo).cor);
  }

  // ===================== ESCOLHA DO PODER =====================

  let escolhaFeita = false;

  // msg: escolhaPoder { oferta: [{ tipo, usos }], jaEscolheu }. aoEscolher(tipo | null)
  function montarEscolha(msg, rotulo, aoEscolher) {
    const lista = $("poder-tipos");
    const titulo = $("poder-titulo");
    const pular = $("btn-pular-poder");
    escolhaFeita = false;
    $("poder-rodada-rotulo").textContent = rotulo;
    titulo.classList.remove("confirmado");
    titulo.textContent = "Escolha um poder";
    pular.disabled = false;
    pular.classList.remove("escolhido");

    const oferta = msg.oferta || [];
    lista.classList.toggle("tres", oferta.length <= 3);
    const cartoes = oferta.map(({ tipo, usos }, i) => {
      const p = info(tipo);
      const btn = el("button", "poder-btn");
      btn.type = "button";
      btn.style.setProperty("--cor", p.cor);
      btn.style.animationDelay = `${i * 45}ms`;
      btn.append(el("span", "poder-icone", p.icone), el("span", "poder-nome", p.nome));
      // usos restantes: só nos poderes com limite (o servidor manda null nos de ataque)
      if (usos !== null && usos !== undefined) btn.append(el("span", "poder-usos", `${usos}x`));
      btn.setAttribute("aria-label", p.nome + (usos ? `, ${usos} usos restantes` : ""));
      btn.addEventListener("click", () => {
        if (escolhaFeita) return;
        escolhaFeita = true;
        corDoPoder(tipo);
        cartoes.forEach((b) => { if (b !== btn) b.classList.add("apagado"); });
        btn.classList.add("selecionada");
        travar();
        if (navigator.vibrate) navigator.vibrate(30);
        titulo.classList.add("confirmado");
        titulo.textContent = `${p.icone} ${p.nome}!`;
        aoEscolher(tipo);
      });
      return btn;
    });
    lista.replaceChildren(...cartoes);

    function travar() {
      cartoes.forEach((b) => (b.disabled = true));
      pular.disabled = true;
    }

    pular.onclick = () => {
      if (escolhaFeita) return;
      escolhaFeita = true;
      cartoes.forEach((b) => b.classList.add("apagado"));
      travar();
      pular.classList.add("escolhido");
      titulo.textContent = "Sem poder nesta pergunta";
      aoEscolher(null);
    };

    if (msg.jaEscolheu) {
      // voltou de uma queda depois de já ter escolhido
      escolhaFeita = true;
      cartoes.forEach((b) => b.classList.add("apagado"));
      travar();
      titulo.textContent = "Escolha registrada!";
    }
  }

  // ===================== ESCOLHA DO ALVO =====================

  let alvoFeito = false;

  // colunas/linhas pela orientação e pela quantidade: sempre cabe sem rolar
  function ajustarGrade() {
    const lista = $("alvo-lista");
    const cards = [...lista.children];
    const n = cards.length;
    if (!n) return;
    const emPe = matchMedia("(orientation: portrait)").matches;
    const colunas = emPe ? (n <= 3 ? 1 : 2) : (n <= 4 ? n : Math.ceil(n / 2));
    const linhas = Math.ceil(n / colunas);
    lista.style.setProperty("--colunas", colunas);
    lista.style.setProperty("--linhas", linhas);
    // centraliza a última linha incompleta
    const resto = n % colunas;
    cards.forEach((c) => (c.style.gridColumn = ""));
    if (resto) cards[n - resto].style.gridColumn = `${colunas - resto + 1} / span 2`;
    lista.classList.toggle("uma-coluna", colunas === 1);
  }

  function painel(icone, titulo, texto) {
    $("alvo-lista").classList.add("oculto");
    $("alvo-lista").replaceChildren();
    $("sem-poder").classList.remove("oculto");
    $("sem-poder-icone").textContent = icone;
    $("sem-poder-titulo").textContent = titulo;
    $("sem-poder-texto").textContent = texto;
  }

  // o ícone sai do chip do título e cai em arco no avatar do alvo
  function voarIcone(icone, origemEl, destinoEl) {
    if (!origemEl || !destinoEl || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const o = origemEl.getBoundingClientRect();
    const d = destinoEl.getBoundingClientRect();
    const voo = el("span", "voo-poder", icone);
    const tam = Math.max(22, d.height * 0.5);
    voo.style.fontSize = `${tam}px`;
    document.body.append(voo);
    const x0 = o.left + o.width / 2 - tam / 2, y0 = o.top + o.height / 2 - tam / 2;
    const x1 = d.left + d.width / 2 - tam / 2, y1 = d.top + d.height / 2 - tam / 2;
    const arco = Math.min(120, Math.abs(x1 - x0) * 0.3 + 40);
    const frames = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * arco;
      frames.push({ transform: `translate(${x}px, ${y}px) rotate(${t * 360}deg) scale(${1 + Math.sin(Math.PI * t) * 0.4})`, opacity: t > 0.9 ? 0 : 1 });
    }
    voo.animate(frames, { duration: 480, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" }).onfinish = () => voo.remove();
  }

  // msg: escolhaAlvo { temPoder, precisaAlvo, tipo, alvosPossiveis, premioAposta, jaUsou }
  // aoEscolher(alvoId)
  function montarAlvo(msg, aoEscolher) {
    const lista = $("alvo-lista");
    const titulo = $("alvo-titulo");
    const subtitulo = $("alvo-subtitulo");
    alvoFeito = false;
    titulo.classList.remove("confirmado");
    subtitulo.textContent = "";
    $("sem-poder").classList.add("oculto");
    lista.classList.remove("oculto");

    const p = info(msg.tipo);
    if (msg.tipo) corDoPoder(msg.tipo);

    if (!msg.temPoder) {
      titulo.textContent = "Escolha de alvo";
      painel("🤷", "Você não tem poder nesta pergunta", "Aguarde os outros escolherem o alvo…");
      return;
    }
    if (msg.jaUsou) {
      titulo.textContent = `${p.icone} ${p.nome}`;
      painel(p.icone, "Alvo escolhido!", "Aguarde os outros escolherem…");
      return;
    }
    if (!msg.precisaAlvo) {
      // Escudo e Festa já valeram na escolha: só confirma
      titulo.classList.add("confirmado");
      titulo.textContent = `${p.icone} ${p.nome}!`;
      if (msg.tipo === "escudo") painel(p.icone, "Escudo ativado!", "Nenhum ataque te atinge nesta pergunta");
      else if (msg.tipo === "festa") painel(p.icone, "Festa de Pontos ativada!", "Quem acertar esta pergunta ganha o dobro");
      else painel(p.icone, `${p.nome} ativado!`, "Aguarde os outros escolherem o alvo…");
      return;
    }

    const chip = el("span", "poder-chip");
    chip.append(el("span", "", p.icone), document.createTextNode(p.nome));
    if (p.aFavor) {
      titulo.replaceChildren("Fazer ", chip, " em quem?");
      subtitulo.textContent = `Se ele acertar, você ganha +${msg.premioAposta ?? 75}`;
    } else {
      titulo.replaceChildren("Usar ", chip, " em quem?");
      subtitulo.textContent = "Toque em um jogador";
    }

    // o servidor já manda do líder para baixo, com a posição de cada um
    const cartoes = (msg.alvosPossiveis || []).map((alvo, i) => {
      const btn = el("button", "alvo-btn");
      btn.type = "button";
      btn.style.setProperty("--cor-alvo", alvo.avatar ? alvo.avatar.cor : "#94a3b8");
      btn.style.animationDelay = `${i * 45}ms`;
      const av = el("span", "alvo-avatar", alvo.avatar ? alvo.avatar.emoji : "❔");
      if (alvo.posicao === 1) av.append(el("span", "alvo-coroa", "👑"));
      av.append(el("span", "alvo-efeito", p.icone));
      const infoEl = el("span", "alvo-info");
      infoEl.append(el("span", "alvo-nome", alvo.nome), el("span", "alvo-pontos", `${alvo.posicao}º · ${alvo.pontos} pts`));
      btn.append(av, infoEl);
      btn.setAttribute("aria-label", `${alvo.nome}, ${alvo.posicao}º lugar, ${alvo.pontos} pontos`);
      btn.addEventListener("click", () => {
        if (alvoFeito) return;
        alvoFeito = true;
        cartoes.forEach((b) => {
          b.disabled = true;
          if (b !== btn) b.classList.add("apagado");
        });
        btn.classList.add("selecionada");
        if (navigator.vibrate) navigator.vibrate(30);
        voarIcone(p.icone, chip, av);
        titulo.classList.add("confirmado");
        if (p.aFavor) {
          titulo.replaceChildren(`${p.icone} Você apostou em ${alvo.nome}!`);
        } else {
          titulo.replaceChildren(`${p.icone} ${p.nome} vai para ${alvo.nome}!`);
          subtitulo.textContent = "Olhe para a TV";
        }
        aoEscolher(alvo.id);
      });
      return btn;
    });
    lista.replaceChildren(...cartoes);
    ajustarGrade();
  }

  // o tempo acabou sem escolher: o poder não foi usado
  function tempoEsgotadoAlvo() {
    if (alvoFeito) return;
    const cartoes = document.querySelectorAll("#alvo-lista .alvo-btn");
    if (!cartoes.length) return;
    cartoes.forEach((b) => { b.disabled = true; b.classList.add("apagado"); });
    $("alvo-titulo").replaceChildren("Tempo esgotado!");
    $("alvo-subtitulo").textContent = "O poder não foi usado nesta pergunta";
  }

  matchMedia("(orientation: portrait)").addEventListener("change", ajustarGrade);
  window.addEventListener("resize", ajustarGrade);

  return { POR_TIPO, info, montarEscolha, montarAlvo, tempoEsgotadoAlvo };
})();

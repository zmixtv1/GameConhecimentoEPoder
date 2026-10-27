// Resultado da pergunta na TV. O placar entra na ordem anterior, o "+pontos"
// de cada um aparece e o total conta para cima, e só então as linhas deslizam
// para a posição nova - com seta de quem subiu ou caiu e coroa para o líder.
//
// Com Aposta na pergunta, a tela vira o placar sozinho e maior, com a linha
// de quem apostou; sem Aposta, mostra também as alternativas.
// Referências: teste/teste-pontuação.html e teste/teste-pontuacao-aposta.html.
window.TelaPontuacao = (() => {
  // linha do tempo (ms) de cada forma da tela
  const TEMPOS = {
    normal: { revelar: 1100, avatares: 1400, placar: 1900, apostas: null, ganhos: 3100, contagem: 1100, reordenar: 4500, rodape: 5600 },
    aposta: { revelar: 0, avatares: 0, placar: 900, apostas: 2000, ganhos: 2400, contagem: 1100, reordenar: 3700, rodape: 4800 },
    desafio: { revelar: 0, avatares: 0, placar: 1200, apostas: null, ganhos: 2400, contagem: 1100, reordenar: 3800, rodape: 4900 },
  };
  const SELO_SVG =
    '<svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  let timers = [];
  const depois = (ms, fn) => timers.push(setTimeout(fn, ms));

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function avatarEl(jogador) {
    const a = el("span", "avatar", jogador && jogador.avatar ? jogador.avatar.emoji : "❔");
    a.style.background = jogador && jogador.avatar
      ? `color-mix(in srgb, ${jogador.avatar.cor} 22%, white)`
      : "var(--surface)";
    return a;
  }

  // ordena e calcula a posição com empate (1, 2, 3, 3, 5...)
  function ranquear(lista, campo) {
    const ordenado = [...lista].sort((a, b) => b[campo] - a[campo] || a.nome.localeCompare(b.nome));
    return ordenado.map((j) => ({ jogador: j, posicao: lista.filter((o) => o[campo] > j[campo]).length + 1 }));
  }

  function medirVariavel(tela, nome) {
    const sonda = el("div");
    sonda.style.cssText = `position:absolute;visibility:hidden;height:var(${nome})`;
    tela.append(sonda);
    const h = sonda.getBoundingClientRect().height;
    sonda.remove();
    return h;
  }

  // ---------- cabeçalho ----------

  function renderizarCabecalho(r, msg, alternativas) {
    r.titulo.replaceChildren("Resposta certa: ", el("span", "resposta", alternativas[msg.respostaCorretaIndex] ?? ""));
    const total = (msg.respostasPorJogador || []).length;
    const acertos = (msg.respostasPorJogador || []).filter((x) => x.alternativaIndex === msg.respostaCorretaIndex).length;
    r.subtitulo.textContent =
      acertos === 0 ? "Ninguém acertou dessa vez!"
        : acertos === total ? "Todo mundo acertou! 🎉"
          : `${acertos} de ${total} acertaram`;
    r.festa.classList.toggle("oculto", !msg.festaAtiva);
  }

  // ---------- alternativas (só na forma normal) ----------

  function renderizarAlternativas(r, msg, alternativas, jogadores, T) {
    const porId = new Map(jogadores.map((j) => [j.id, j]));
    const porAlternativa = alternativas.map(() => []);
    const semResposta = [];
    for (const resp of msg.respostasPorJogador || []) {
      const jogador = porId.get(resp.id) || resp;
      if (resp.alternativaIndex !== null && porAlternativa[resp.alternativaIndex]) porAlternativa[resp.alternativaIndex].push(jogador);
      else semResposta.push(jogador);
    }

    const certa = msg.respostaCorretaIndex;
    const cards = alternativas.map((texto, i) => {
      const card = el("div", "res-alternativa glass-panel " + (i === certa ? "correta" : "errada"));
      card.style.animationDelay = `${i * 0.09}s`;
      card.append(el("span", "texto", texto));
      const avs = el("div", "avatares");
      porAlternativa[i].forEach((j) => avs.append(avatarEl(j)));
      card.append(avs);
      if (i === certa) {
        const selo = el("span", "selo-certo");
        selo.innerHTML = SELO_SVG;
        card.append(selo);
      }
      return card;
    });
    r.alternativas.replaceChildren(...cards);

    r.semResposta.classList.remove("visivel");
    r.semResposta.replaceChildren();
    if (semResposta.length) {
      r.semResposta.append(el("span", "", "Não responderam:"));
      semResposta.forEach((j) => r.semResposta.append(avatarEl(j)));
    }

    depois(T.revelar, () => cards.forEach((c) => c.classList.add("revelada")));
    depois(T.avatares, () => {
      let atraso = 0;
      [cards[certa], ...cards.filter((_, i) => i !== certa)].filter(Boolean).forEach((c) => {
        c.querySelectorAll(".avatar").forEach((a) => {
          a.style.animationDelay = `${atraso}ms`;
          a.classList.add("caiu");
          atraso += 90;
        });
      });
      depois(atraso + 200, () => r.semResposta.classList.add("visivel"));
    });
  }

  // ---------- placar ----------

  function criarAposta(jogador, apostas) {
    const ap = apostas.find((a) => a.apostadorId === jogador.id);
    if (!ap) return null;
    const linha = el("span", "aposta " + (ap.ganhou ? "ganhou" : "perdeu"));
    const emoji = ap.alvo && ap.alvo.avatar ? `${ap.alvo.avatar.emoji} ` : "";
    linha.append(
      el("span", "dado", "🎲"),
      el("span", "texto-aposta", ap.ganhou
        ? `Apostou em ${emoji}${ap.alvoNome}, que acertou: +${ap.premio}`
        : `Apostou em ${emoji}${ap.alvoNome}, que errou`)
    );
    return { el: linha, ganhou: ap.ganhou };
  }

  function contar(linha, de, ate, duracao) {
    const t0 = performance.now();
    linha.pontos.classList.add("contando");
    (function passo(agora) {
      const t = Math.min(1, (agora - t0) / duracao);
      const e = 1 - Math.pow(1 - t, 3);
      linha.numero.textContent = String(Math.round(de + (ate - de) * e));
      if (t < 1) requestAnimationFrame(passo);
      else depois(400, () => linha.pontos.classList.remove("contando"));
    })(t0);
  }

  // detalhe(jogador): uma linha opcional embaixo do nome (no desafio, os acertos)
  function renderizarPlacar(r, msg, apostas, T, detalhe = null) {
    const lista = (msg.placar || []).map((j) => ({ ...j, anterior: j.pontos - (j.ganho || 0) }));
    const antes = ranquear(lista, "anterior");
    const agora = ranquear(lista, "pontos");
    const indiceAntes = new Map(antes.map((x, i) => [x.jogador.id, i]));
    const indiceAgora = new Map(agora.map((x, i) => [x.jogador.id, i]));
    const posAntes = new Map(antes.map((x) => [x.jogador.id, x.posicao]));
    const posAgora = new Map(agora.map((x) => [x.jogador.id, x.posicao]));

    const passo = medirVariavel(r.tela, "--linha-h") + medirVariavel(r.tela, "--linha-gap");
    r.placar.style.height = `${Math.max(0, lista.length * passo - medirVariavel(r.tela, "--linha-gap"))}px`;
    r.placarInfo.textContent = `${lista.length} jogadores`;

    function colocar(linha, indice, pos) {
      linha.li.style.setProperty("--y", `${indice * passo}px`);
      linha.li.style.zIndex = String(100 - indice);
      linha.posicao.textContent = `${pos}º`;
      linha.posicao.className = "posicao" + (pos <= 3 ? ` p${pos}` : "");
    }

    const linhas = lista.map((j) => {
      const li = el("li", "linha glass-panel");
      const posicao = el("span", "posicao");
      const av = avatarEl(j);
      av.append(el("span", "coroa", "👑"));
      const info = el("div", "info");
      info.append(el("span", "nome", j.nome));
      const aposta = criarAposta(j, apostas);
      if (aposta) info.append(aposta.el);
      const linhaDetalhe = detalhe ? detalhe(j) : null;
      if (linhaDetalhe) info.append(linhaDetalhe);
      const mudanca = el("span", "mudanca");
      const ganho = el("span", "ganho " + (j.ganho > 0 ? "positivo" : "zero"), j.ganho > 0 ? `+${j.ganho}` : "+0");
      const pontos = el("span", "pontos");
      const numero = el("span", "", String(j.anterior));
      pontos.append(numero, el("small", "", "pts"));
      li.append(posicao, av, info, mudanca, ganho, pontos);
      const linha = { j, li, posicao, mudanca, ganho, pontos, numero, aposta };
      colocar(linha, indiceAntes.get(j.id), posAntes.get(j.id));
      return linha;
    });
    r.placar.replaceChildren(...linhas.map((l) => l.li));

    // 1) entra na ordem anterior, uma linha de cada vez
    depois(T.placar, () => {
      linhas
        .slice()
        .sort((a, b) => indiceAntes.get(a.j.id) - indiceAntes.get(b.j.id))
        .forEach((l, i) => depois(i * 70, () => l.li.classList.add("entrou")));
    });

    // 2) a linha da aposta aparece pra quem apostou, e o dado rola
    if (T.apostas !== null) {
      depois(T.apostas, () => {
        linhas.filter((l) => l.aposta).forEach((l, i) => depois(i * 150, () => {
          l.aposta.el.classList.add("visivel");
          if (l.aposta.ganhou) l.li.classList.add("aposta-ganhou");
        }));
      });
    }

    // 3) o +pontos aparece e o total conta para cima
    depois(T.ganhos, () => {
      linhas.forEach((l, i) => depois(i * 60, () => {
        l.ganho.classList.add("visivel");
        if (l.j.ganho > 0) contar(l, l.j.anterior, l.j.pontos, T.contagem);
      }));
    });

    // 4) desliza para a posição nova, com setas e a coroa do líder
    depois(T.reordenar, () => {
      linhas.forEach((l) => {
        const id = l.j.id;
        const iAntes = indiceAntes.get(id);
        const iAgora = indiceAgora.get(id);
        colocar(l, iAgora, posAgora.get(id));
        if (iAgora < iAntes) l.li.style.zIndex = "300"; // quem sobe passa por cima
        const delta = posAntes.get(id) - posAgora.get(id);
        l.mudanca.textContent = delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : "•";
        l.mudanca.className = "mudanca " + (delta > 0 ? "subiu" : delta < 0 ? "caiu" : "igual");
        depois(700, () => {
          l.mudanca.classList.add("visivel");
          l.li.style.zIndex = String(100 - iAgora);
        });
        l.li.classList.toggle("lider", posAgora.get(id) === 1);
      });
    });
  }

  function reiniciarAnimacoesDoCabecalho(r) {
    for (const e of [r.rotulo, r.titulo, r.subtitulo, r.festa]) {
      e.style.animation = "none";
      void e.offsetWidth;
      e.style.animation = "";
    }
  }

  // ---------- entrada ----------

  // msg: a mensagem resultadoPergunta. alternativas: o texto delas (a TV que
  // reconectou não viu a pergunta, então vem junto). jogadores: com avatar.
  function elementos() {
    return {
      tela: document.getElementById("tela-resultado"),
      rotulo: document.getElementById("res-rotulo"),
      titulo: document.getElementById("res-titulo"),
      subtitulo: document.getElementById("res-subtitulo"),
      festa: document.getElementById("res-festa"),
      tituloEsquerda: document.getElementById("res-titulo-esquerda"),
      alternativas: document.getElementById("res-alternativas"),
      semResposta: document.getElementById("res-sem-resposta"),
      placar: document.getElementById("res-placar"),
      placarInfo: document.getElementById("res-placar-info"),
      rodape: document.getElementById("progresso-proximo"),
    };
  }

  function montar(msg, { alternativas, jogadores }) {
    parar();
    const r = elementos();
    r.tela.classList.remove("modo-desafio");
    r.titulo.classList.remove("longo");
    r.rotulo.textContent = "Resultado da pergunta";
    r.tituloEsquerda.textContent = "Respostas";

    // o alvo da aposta vem só com id e nome: o animal sai da lista de jogadores
    const porId = new Map(jogadores.map((j) => [j.id, j]));
    const apostas = (msg.apostas || []).map((a) => ({ ...a, alvo: porId.get(a.alvoId) }));
    const modo = apostas.length > 0 ? "aposta" : "normal";
    const T = TEMPOS[modo];
    r.tela.classList.toggle("modo-aposta", modo === "aposta");

    r.rodape.classList.remove("visivel");
    r.rodape.replaceChildren(el("span", "pontinhos", "Aguardando jogadores confirmarem"));
    reiniciarAnimacoesDoCabecalho(r);
    renderizarCabecalho(r, msg, alternativas);
    if (modo === "normal") renderizarAlternativas(r, msg, alternativas, jogadores, T);
    renderizarPlacar(r, msg, apostas, T);
    depois(T.rodape, () => r.rodape.classList.add("visivel"));
  }

  // Resultado de um desafio (Ligação ou Classificação): a mesma tela do
  // resultado da pergunta, com o gabarito no lugar das alternativas e os
  // acertos de cada um embaixo do nome no placar.
  // dados: { rotulo, titulo, subtitulo, gabarito: Element, placar, detalhe(jogador) }
  function montarDesafio(dados) {
    parar();
    const r = elementos();
    const T = TEMPOS.desafio;
    r.tela.classList.remove("modo-aposta");
    r.tela.classList.add("modo-desafio");

    r.rodape.classList.remove("visivel");
    r.rodape.replaceChildren(el("span", "pontinhos", "Aguardando jogadores confirmarem"));
    reiniciarAnimacoesDoCabecalho(r);
    r.rotulo.textContent = dados.rotulo;
    r.titulo.textContent = dados.titulo;
    // "Personagem de Harry Potter ou Personagem de O Senhor dos Anéis" não cabe
    // no tamanho normal: encolhe para ficar numa linha e não empurrar o placar
    r.titulo.classList.toggle("longo", dados.titulo.length > 28);
    r.subtitulo.textContent = dados.subtitulo || "";
    r.festa.classList.add("oculto");

    r.tituloEsquerda.textContent = "Gabarito";
    r.alternativas.replaceChildren(dados.gabarito);
    r.semResposta.classList.remove("visivel");
    r.semResposta.replaceChildren();

    renderizarPlacar(r, { placar: dados.placar }, [], T, dados.detalhe);
    depois(T.rodape, () => r.rodape.classList.add("visivel"));
  }

  function mostrarProgresso(confirmados, total) {
    const rodape = document.getElementById("progresso-proximo");
    rodape.replaceChildren(el("span", "", `${confirmados} de ${total} confirmaram estar prontos`));
    rodape.classList.add("visivel");
  }

  function parar() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  return { montar, montarDesafio, mostrarProgresso, parar };
})();

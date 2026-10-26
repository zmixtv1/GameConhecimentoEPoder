// Entre a última rodada e a corrida, a TV mostra a pontuação de cada um
// virando o andar de largada: do último colocado para o primeiro, os pontos
// "fluem" para a escadinha da linha e, a cada degrau que acende, o bicho pula
// um andar na pirâmide. Referência: teste/teste-conversao-andar.html.
//
// O cálculo é do servidor (mensagem largadaPiramide); aqui só se anima.
window.TelaLargada = (() => {
  const T = { inicio: 1000, fluxo: 260, pulo: 300, pausa: 260, semPulo: 520, regra: 800 };

  let piramide = null;
  let token = 0;

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function criarLinha(j, maxPulos) {
    const li = el("li", "lg-linha glass-panel");
    li.style.setProperty("--cor", j.avatar ? j.avatar.cor : "#94a3b8");
    const av = el("span", "lg-av");
    av.append(el("span", "", j.avatar ? j.avatar.emoji : "❔"));
    const pts = el("span", "lg-pts");
    pts.append(document.createTextNode(String(j.pontos)), el("small", "", "pts"));
    const degraus = el("span", "lg-degraus");
    for (let i = 0; i < maxPulos; i++) {
      const d = el("i");
      d.style.height = `${Math.round((100 * (i + 1)) / maxPulos)}%`; // degraus crescentes
      degraus.append(d);
    }
    const largada = el("span", "lg-largada");
    largada.append(el("b", "", "—"), el("small", "", " "));
    li.append(
      el("span", "lg-pos" + (j.colocacao === 1 ? " p1" : ""), `${j.colocacao}º`),
      av,
      el("span", "lg-nome", j.nome),
      pts,
      el("span", "lg-seta", "➜"),
      degraus,
      el("span", "lg-ganho", "+0"),
      largada
    );
    return li;
  }

  // partículas saindo dos pontos e entrando no degrau
  function fluxo(overlay, deEl, paraEl, cor, qtd, duracao, meu) {
    const a = deEl.getBoundingClientRect();
    const d = paraEl.getBoundingClientRect();
    const x0 = a.left + a.width * 0.7, y0 = a.top + a.height / 2;
    const x1 = d.left + d.width / 2, y1 = d.top + d.height / 2;
    const promessas = [];
    for (let i = 0; i < qtd; i++) {
      const p = el("div", "p3d-particula");
      p.style.setProperty("--cor", cor);
      overlay.append(p);
      const alt = 18 + Math.random() * 22;
      const frames = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        frames.push({
          transform: `translate(${x0 + (x1 - x0) * t}px, ${y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * alt}px) scale(${1 - t * 0.4})`,
          opacity: t < 0.1 ? t * 10 : 1,
        });
      }
      const anim = p.animate(frames, { duration: duracao, delay: i * 20, easing: "cubic-bezier(.45,0,.55,1)", fill: "both" });
      promessas.push(anim.finished.then(() => p.remove(), () => p.remove()));
    }
    return Promise.all(promessas).then(() => meu === token);
  }

  // payload: mensagem largadaPiramide. ordemDeEntrada: os jogadores na ordem em
  // que entraram na sala - é dela que saem as faixas, iguais às da corrida.
  async function montar(payload, ordemDeEntrada) {
    const meu = ++token;
    if (piramide) piramide.destruir();

    const tela = document.getElementById("tela-largada");
    const area = document.getElementById("lg-area-piramide");
    const lista = document.getElementById("lg-linhas");
    const rotulo = document.getElementById("lg-rotulo");
    const subtitulo = document.getElementById("lg-subtitulo");
    const regras = ["lg-regra-1", "lg-regra-2", "lg-regra-3"].map((id) => document.getElementById(id));

    lista.replaceChildren();
    regras.forEach((r) => r.classList.remove("ativa"));
    rotulo.textContent = "Fim das rodadas";
    subtitulo.classList.remove("final");
    subtitulo.textContent = "Quem fez mais pontos começa mais alto na Pirâmide";
    document.getElementById("lg-regra-1-texto").textContent = `Do chão (0) até o andar ${payload.maxPulos}, pelos pontos`;
    document.getElementById("lg-regra-3-texto").textContent = `O andar ${payload.totalAndares} é a vitória`;

    piramide = Piramide3D.criar({ raiz: tela, area, totalAndares: payload.totalAndares });
    piramide.desenhar();

    const faixas = Piramide3D.distribuirFaixas(
      ordemDeEntrada.filter((j) => payload.jogadores.some((p) => p.id === j.id))
    );

    // a lista vem do primeiro para o último colocado
    const estado = payload.jogadores.map((j) => {
      const linha = criarLinha(j, payload.maxPulos);
      lista.append(linha);
      const s = piramide.adicionar(j, faixas.get(j.id) || { lado: "esquerda", faixa: 0.5 }, 0);
      return { j, linha, s };
    });

    // 1) entrada: linhas e bichos no chão
    estado.forEach((x, k) => setTimeout(() => {
      if (meu !== token) return;
      x.linha.classList.add("entrou");
      x.s.animal.classList.add("visivel");
    }, 120 + k * 70));

    await esperar(T.inicio);
    if (meu !== token) return;
    regras[0].classList.add("ativa");
    estado.forEach((x) => x.linha.classList.add("espera"));

    // 2) a conversão, do último para o primeiro
    for (let k = estado.length - 1; k >= 0; k--) {
      const { j, linha, s } = estado[k];
      linha.classList.remove("espera");
      linha.classList.add("ativa");
      s.animal.classList.add("ativo");

      const ptsEl = linha.querySelector(".lg-pts");
      const degraus = linha.querySelectorAll(".lg-degraus i");
      const ganhoEl = linha.querySelector(".lg-ganho");
      const cor = j.avatar ? j.avatar.cor : "#94a3b8";

      if (j.pulos === 0) {
        await piramide.pularNoLugar(s);
        await esperar(T.semPulo - 380);
      } else {
        // o próximo degrau já começa a encher enquanto o bicho pula
        let pulo = Promise.resolve(true);
        for (let passo = 1; passo <= j.pulos; passo++) {
          const ok = await fluxo(piramide.overlay, ptsEl, degraus[passo - 1], cor, 5, T.fluxo, meu);
          if (!ok || !(await pulo)) return;
          degraus[passo - 1].classList.add("aceso");
          ganhoEl.textContent = `+${passo}`;
          ganhoEl.classList.add("positivo");
          pulo = piramide.animarSubida(s, passo, T.pulo).then((ok2) => {
            if (ok2) piramide.pulsarRotulo(passo);
            return ok2;
          });
        }
        if (!(await pulo)) return;
      }
      if (meu !== token) return;

      const larg = linha.querySelector(".lg-largada");
      larg.querySelector("b").textContent = j.largada === 0 ? "Chão" : `Andar ${j.largada}`;
      larg.querySelector("small").textContent = j.faltam === 1 ? "falta 1 acerto" : `faltam ${j.faltam} acertos`;
      larg.classList.add("pronta");

      await esperar(T.pausa);
      if (meu !== token) return;
      linha.classList.remove("ativa");
      s.animal.classList.remove("ativo");
    }

    // 3) as regras da corrida
    rotulo.textContent = "Tudo pronto!";
    await esperar(T.regra * 0.5);
    if (meu !== token) return;
    regras[1].classList.add("ativa");
    await esperar(T.regra);
    if (meu !== token) return;
    regras[2].classList.add("ativa");
    subtitulo.classList.add("final");
    subtitulo.textContent = "Valendo! Cada acerto = +1 andar 🚀";
  }

  function redimensionar() {
    if (piramide) piramide.redimensionar();
  }

  function parar() {
    token++;
    if (piramide) {
      piramide.destruir();
      piramide = null;
    }
  }

  return { montar, redimensionar, parar };
})();

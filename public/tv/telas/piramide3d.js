// A pirâmide isométrica, usada pela tela da largada (a pontuação virando
// andar) e pela corrida. Chão = posição 0, na frente da pirâmide; andares de
// 1 a `totalAndares`, com o topo dourado no último.
// Referências: teste/teste-conversao-andar.html e teste/teste-piramide-final.html.
//
// Os bichos não ocupam blocos: cada um anda pela borda visível de cada andar,
// numa faixa fixa (lado + posição ao longo da borda). Por isso o bicho sobe
// reto e mantém a posição relativa sozinho, sem colisão nem limite por andar.
window.Piramide3D = (() => {
  const AVANCO_BORDA = 0.25; // quanto o bicho fica para fora do degrau, em blocos
  const ALTURA_PULO = 1.1; // fração da altura do andar no arco do pulo
  const ALTURA_ROTULOS = 1.5;
  const ESPACO_ROTULOS = 70;

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // Divide os jogadores entre as duas bordas visíveis, alternando, e espalha
  // cada borda igualmente. Os protótipos fixavam 8 faixas; a sala tem de 2 a 8.
  function distribuirFaixas(jogadores) {
    const esquerda = jogadores.filter((_, i) => i % 2 === 0);
    const direita = jogadores.filter((_, i) => i % 2 === 1);
    const faixa = (k, n) => (n === 1 ? 0.5 : 0.18 + 0.65 * (k / (n - 1)));
    const mapa = new Map();
    esquerda.forEach((j, k) => mapa.set(j.id, { lado: "esquerda", faixa: faixa(k, esquerda.length) }));
    direita.forEach((j, k) => mapa.set(j.id, { lado: "direita", faixa: faixa(k, direita.length) }));
    return mapa;
  }

  // raiz: a tela (recebe as variáveis CSS e a camada dos bichos)
  // area: o espaço onde a pirâmide é desenhada
  function criar({ raiz, area, totalAndares, comRotulos = true, larguraEmBlocos = 11.6, alturaEmBlocos = 9.6, maxBloco = 96 }) {
    const TOPO = totalAndares;
    const wrap = el("div", "p3d-wrap");
    const stage = el("div", "p3d-stage");
    const anchors = el("div", "p3d-anchors");
    stage.append(anchors);
    wrap.append(stage);
    area.append(wrap);
    const overlay = el("div", "p3d-overlay");
    raiz.append(overlay);

    let b = 56;
    let bz = 22;
    let token = 0;
    let rotulos = [];
    const animais = new Map(); // jogadorId -> { j, lado, faixa, nivel, animal, sombra, ancora, ancoraSombra }

    function medir() {
      const a = area.getBoundingClientRect();
      const espaco = comRotulos ? ESPACO_ROTULOS : 0;
      b = Math.max(20, Math.min((a.width - espaco) / larguraEmBlocos, a.height / alturaEmBlocos, maxBloco));
      bz = b * 0.4;
      raiz.style.setProperty("--b", `${b}px`);
      raiz.style.setProperty("--bz", `${bz}px`);
      raiz.style.setProperty("--emoji", `${b * 0.62}px`);
    }

    function construir() {
      stage.querySelectorAll(".p3d-bloco, .p3d-chao").forEach((e) => e.remove());
      const frag = document.createDocumentFragment();
      for (let nivel = 0; nivel < totalAndares; nivel++) {
        const tam = totalAndares - nivel;
        const classe = nivel === totalAndares - 1 ? "topo" : nivel % 2 === 0 ? "claro" : "escuro";
        for (let x = 0; x < tam; x++) {
          for (let y = 0; y < tam; y++) {
            const bloco = el("div", "p3d-bloco " + classe);
            bloco.style.left = `${(x - (tam - 1) / 2) * b - b / 2}px`;
            bloco.style.top = `${(y - (tam - 1) / 2) * b - b / 2}px`;
            bloco.style.transform = `translateZ(${nivel * bz}px)`;
            frag.append(bloco);
          }
        }
      }
      const chao = el("div", "p3d-chao");
      const lado = (totalAndares + 3) * b;
      chao.style.left = `${-lado / 2}px`;
      chao.style.top = `${-lado / 2}px`;
      chao.style.width = chao.style.height = `${lado}px`;
      chao.style.transform = `translateZ(${-bz}px)`;
      frag.prepend(chao);
      stage.insertBefore(frag, anchors);
    }

    // centraliza o desenho projetado dentro da área
    function centralizar() {
      wrap.style.transform = "";
      let l = Infinity, t = Infinity, r = -Infinity, bt = -Infinity;
      stage.querySelectorAll(".p3d-bloco").forEach((e) => {
        const q = e.getBoundingClientRect();
        l = Math.min(l, q.left);
        t = Math.min(t, q.top);
        r = Math.max(r, q.right);
        bt = Math.max(bt, q.bottom);
      });
      const a = area.getBoundingClientRect();
      const espaco = comRotulos ? ESPACO_ROTULOS : 0;
      const dx = a.left + a.width / 2 + espaco / 2 - (l + r) / 2;
      const dy = a.top + a.height / 2 + b * 0.15 - (t + bt) / 2;
      wrap.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    function criarAncora() {
      const a = el("div", "p3d-anchor");
      anchors.append(a);
      return a;
    }

    // posição 3D -> onde ela cai na tela (a âncora invisível faz a conta)
    function projetar(ancora, pos) {
      ancora.style.transform = `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`;
      const q = ancora.getBoundingClientRect();
      return { x: q.left, y: q.top };
    }

    function criarRotulos() {
      rotulos.forEach((rt) => rt.el.remove());
      rotulos = [];
      if (!comRotulos) return;
      for (let pos = 0; pos <= TOPO; pos++) {
        const rt = el("div", "p3d-rotulo" + (pos === TOPO ? " topo" : pos === 0 ? " chao" : ""));
        rt.append(el("span", "", pos === TOPO ? `${TOPO} 🏆` : String(pos)));
        overlay.append(rt);
        rotulos.push({ pos, el: rt, ancora: criarAncora() });
      }
      posicionarRotulos();
    }

    function posicionarRotulos() {
      if (!rotulos.length || TOPO < 3) return;
      const pts = [];
      for (let pos = 1; pos < TOPO; pos++) {
        const bloco = pos - 1;
        const h = (totalAndares - 1 - bloco) / 2 + AVANCO_BORDA;
        pts[pos] = projetar(rotulos[pos].ancora, { x: -h * b, y: h * b, z: bloco * bz + bz * ALTURA_ROTULOS });
      }
      // chão e topo seguem o mesmo espaçamento da escada de números
      pts[0] = { x: 2 * pts[1].x - pts[2].x, y: 2 * pts[1].y - pts[2].y };
      pts[TOPO] = { x: 2 * pts[TOPO - 1].x - pts[TOPO - 2].x, y: 2 * pts[TOPO - 1].y - pts[TOPO - 2].y };
      pts[TOPO].x += b * 0.45;
      pts[TOPO].y -= b * 0.3;
      for (const rt of rotulos) {
        const p = pts[rt.pos];
        rt.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
    }

    function pulsarRotulo(pos) {
      const rt = rotulos[pos];
      if (!rt) return;
      rt.el.classList.remove("pulso");
      void rt.el.offsetWidth;
      rt.el.classList.add("pulso");
    }

    function posicaoNoNivel(s, pos) {
      if (pos <= 0) {
        // chão: na frente da base, um pouco para fora da pirâmide
        const metade = totalAndares / 2;
        const aoLongo = (s.faixa * 2 - 1) * (metade - 0.5);
        const borda = metade + 0.5;
        const p = s.lado === "direita" ? { x: borda, y: aoLongo } : { x: aoLongo, y: borda };
        return { x: p.x * b, y: p.y * b, z: -bz + 2 };
      }
      const nivel = Math.min(pos, TOPO);
      const bloco = nivel - 1;
      const metade = (totalAndares - 1 - bloco) / 2;
      const aoLongo = (s.faixa * 2 - 1) * metade;
      const borda = nivel < TOPO ? metade + AVANCO_BORDA : 0; // no topo fica no centro
      const p = s.lado === "direita" ? { x: borda, y: aoLongo } : { x: aoLongo, y: borda };
      return { x: p.x * b, y: p.y * b, z: bloco * bz + 2 };
    }

    // `chao` = ponto embaixo do bicho; `altura` = quanto ele está acima (no pulo)
    function aplicarPosicao(s, pos, chao = pos, altura = 0) {
      const p = projetar(s.ancora, pos);
      const c = projetar(s.ancoraSombra, chao);
      s.animal.style.transform = `translate(${p.x}px, ${p.y}px)`;
      s.sombra.style.transform = `translate(${c.x}px, ${c.y}px)`;
      // quem está mais embaixo na tela fica na frente
      const z = Math.round(Math.max(p.y, c.y)) * 2;
      s.animal.style.zIndex = z + 1;
      s.sombra.style.zIndex = z;
      const f = Math.min(1, altura / (bz * 2));
      s.sombra.style.setProperty("--s", (1 - f * 0.45).toFixed(3));
      s.sombra.style.setProperty("--o", (1 - f * 0.5).toFixed(3));
    }

    function adicionar(jogador, { lado, faixa }, nivel = 0) {
      const sombra = el("div", "p3d-sombra");
      sombra.append(el("span"));
      const animal = el("div", "p3d-animal");
      animal.style.setProperty("--cor", jogador.avatar ? jogador.avatar.cor : "#94a3b8");
      const icone = el("div", "p3d-icone", jogador.avatar ? jogador.avatar.emoji : "❔");
      icone.append(el("span", "p3d-trofeu", "🏆"));
      animal.append(icone);
      overlay.append(sombra, animal);
      const s = { j: jogador, lado, faixa, nivel, animal, sombra, ancora: criarAncora(), ancoraSombra: criarAncora() };
      aplicarPosicao(s, posicaoNoNivel(s, nivel));
      animais.set(jogador.id, s);
      return s;
    }

    // salto com arco e easing cúbico; a sombra fica no degrau de baixo até a
    // metade do salto e depois passa para o de cima
    function animarSubida(s, destino, duracao) {
      const meu = token;
      const ini = posicaoNoNivel(s, s.nivel);
      const fim = posicaoNoNivel(s, destino);
      const t0 = performance.now();
      return new Promise((resolve) => {
        function frame(agora) {
          if (meu !== token) return resolve(false);
          const t = Math.min(1, (agora - t0) / duracao);
          const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const arco = Math.sin(Math.PI * t) * bz * ALTURA_PULO;
          const x = ini.x + (fim.x - ini.x) * e;
          const y = ini.y + (fim.y - ini.y) * e;
          const z = ini.z + (fim.z - ini.z) * e + arco;
          const chaoZ = e < 0.5 ? ini.z : fim.z;
          aplicarPosicao(s, { x, y, z }, { x, y, z: chaoZ }, z - chaoZ);
          if (t < 1) requestAnimationFrame(frame);
          else {
            s.nivel = destino;
            resolve(true);
          }
        }
        requestAnimationFrame(frame);
      });
    }

    // pulinho no lugar, pra quem não ganhou andar
    function pularNoLugar(s, duracao = 380) {
      const meu = token;
      const base = posicaoNoNivel(s, s.nivel);
      const t0 = performance.now();
      return new Promise((resolve) => {
        function frame(agora) {
          if (meu !== token) return resolve(false);
          const t = Math.min(1, (agora - t0) / duracao);
          const arco = Math.sin(Math.PI * t) * bz * 0.7;
          aplicarPosicao(s, { ...base, z: base.z + arco }, base, arco);
          if (t < 1) requestAnimationFrame(frame);
          else resolve(true);
        }
        requestAnimationFrame(frame);
      });
    }

    // posiciona sem animar (reconexão, ou quando a mensagem chega atrasada)
    function colocar(s, nivel) {
      s.nivel = nivel;
      aplicarPosicao(s, posicaoNoNivel(s, nivel));
    }

    function desenhar() {
      medir();
      construir();
      centralizar();
      criarRotulos();
    }

    function redimensionar() {
      medir();
      construir();
      centralizar();
      posicionarRotulos();
      for (const s of animais.values()) aplicarPosicao(s, posicaoNoNivel(s, s.nivel));
    }

    function destruir() {
      token++;
      overlay.remove();
      wrap.remove();
      animais.clear();
    }

    return {
      desenhar, redimensionar, adicionar, animarSubida, pularNoLugar, colocar, pulsarRotulo, destruir,
      animais, overlay,
      cancelar: () => token++,
      tamanhoBloco: () => b,
    };
  }

  return { criar, distribuirFaixas };
})();

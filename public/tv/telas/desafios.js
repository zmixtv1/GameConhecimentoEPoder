// Desafios do tema na TV: Ligação e Classificação.
//
// Durante, as duas usam a mesma tela (#tela-desafio), no molde da pergunta:
// pílula do tema e timer redondo em cima, cartão de vidro no meio e os
// bichos embaixo, cada um com o próprio progresso. Quem termina acende na
// cor do jogador, igual a quem trava a resposta na pergunta.
//
// O resultado usa a tela de placar da pergunta (TelaPontuacao.montarDesafio);
// daqui saem só os gabaritos que entram no lugar das alternativas.
window.TelaDesafio = (() => {
  const CIRCUNFERENCIA = 408; // stroke-dasharray do .timer-ring

  let intervalo = null;
  let pods = new Map(); // jogadorId -> { pod, barra, contagem, feitos }

  const $ = (id) => document.getElementById(id);
  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function iniciarTimer(tempoLimiteMs) {
    clearInterval(intervalo);
    const modulo = $("desafio-timer");
    const anel = $("desafio-anel");
    const numero = $("desafio-numero");
    modulo.classList.remove("urgente");
    const inicio = Date.now();
    const atualizar = () => {
      const decorrido = Date.now() - inicio;
      const restanteMs = Math.max(0, tempoLimiteMs - decorrido);
      const restanteS = Math.ceil(restanteMs / 1000);
      anel.style.strokeDashoffset = String(CIRCUNFERENCIA * Math.min(1, decorrido / tempoLimiteMs));
      numero.textContent = String(restanteS);
      modulo.classList.toggle("urgente", restanteS <= 5 && restanteS > 0);
      if (restanteMs <= 0) clearInterval(intervalo);
    };
    atualizar();
    intervalo = setInterval(atualizar, 100);
  }

  // jogadores: a lista da sala, na ordem de entrada, com o animal de cada um
  function montarDock(jogadores, total, criarPod) {
    const dock = $("desafio-dock");
    dock.replaceChildren();
    pods = new Map();
    for (const j of jogadores) {
      const pod = criarPod(j, "thinking");
      const contagem = el("span", "pod-contagem", `0/${total}`);
      const barra = el("div", "pod-barra");
      barra.append(el("i"));
      pod.append(contagem, barra);
      dock.append(pod);
      pods.set(j.id, { pod, barra: barra.firstChild, contagem, feitos: 0 });
    }
  }

  function cabecalho(msg, nomeDoDesafio) {
    $("desafio-rodada").textContent = msg.rodadaAtual ? `Tema ${msg.rodadaAtual} de ${msg.totalRodadas}` : "Desafio";
    $("desafio-nome").textContent = nomeDoDesafio;
  }

  // iniciarLinking { tema, esquerda, totalPares, pontosPorPar, bonusMax, rodadaAtual, totalRodadas, tempoLimiteMs }
  function montarLigacao(msg, { jogadores, criarPod }) {
    cabecalho(msg, "Ligação");
    $("desafio-tema").textContent = msg.tema;
    $("desafio-titulo").textContent = "Ligue cada item ao seu par!";

    const itens = el("div", "desafio-itens");
    (msg.esquerda || []).forEach((texto, i) => {
      const chip = el("span", "desafio-item");
      chip.style.animationDelay = `${0.15 + i * 0.07}s`;
      chip.append(document.createTextNode(texto), el("span", "elo", "🔗"));
      itens.append(chip);
    });
    $("desafio-conteudo").replaceChildren(itens);

    const total = msg.totalPares || (msg.esquerda || []).length;
    $("desafio-dica").textContent = msg.pontosPorPar
      ? `${total} pares · ${msg.pontosPorPar} pontos cada · até +${msg.bonusMax} para quem ligar tudo`
      : `${total} pares para ligar`;

    montarDock(jogadores, total, criarPod);
    iniciarTimer(msg.tempoLimiteMs);
  }

  // iniciarSorting { categoriaA, categoriaB, totalItens, pontosPorItem, rodadaAtual, totalRodadas, tempoLimiteMs }
  function montarClassificacao(msg, { jogadores, criarPod }) {
    cabecalho(msg, "Classificação");
    $("desafio-tema").textContent = "Cada item vai para um dos dois lados";
    $("desafio-titulo").textContent = "Separe em dois grupos!";

    const categorias = el("div", "desafio-categorias");
    categorias.append(
      el("div", "desafio-categoria a", msg.categoriaA),
      el("span", "desafio-ou", "ou"),
      el("div", "desafio-categoria b", msg.categoriaB)
    );
    $("desafio-conteudo").replaceChildren(categorias);

    const total = msg.totalItens || 8;
    $("desafio-dica").textContent = msg.pontosPorItem
      ? `${total} itens · ${msg.pontosPorItem} pontos por item certo`
      : `${total} itens para classificar`;

    montarDock(jogadores, total, criarPod);
    iniciarTimer(msg.tempoLimiteMs);
  }

  // progressoLinking / progressoSorting { jogadores: [{ id, corretos | respondidos, total, completou?, conectado }] }
  function atualizar(jogadores) {
    for (const j of jogadores) {
      const p = pods.get(j.id);
      if (!p) continue;
      const feitos = j.corretos ?? j.respondidos ?? 0;
      const total = j.total || 1;
      const terminou = j.completou ?? feitos >= total;

      p.barra.style.width = `${Math.round((100 * feitos) / total)}%`;
      p.contagem.textContent = `${feitos}/${total}`;
      if (feitos > p.feitos && !terminou) {
        p.pod.classList.remove("avancou");
        void p.pod.offsetWidth; // reinicia a animação do pulinho
        p.pod.classList.add("avancou");
      }
      p.feitos = feitos;
      p.pod.classList.toggle("locked", terminou);
      p.pod.classList.toggle("thinking", !terminou);
      if (j.conectado !== undefined) p.pod.classList.toggle("desconectado", j.conectado === false);
    }
  }

  // jogadoresAtualizados: quem caiu fica apagado até voltar
  function marcarConexao(jogadores) {
    for (const j of jogadores) {
      const p = pods.get(j.id);
      if (p) p.pod.classList.toggle("desconectado", j.conectado === false);
    }
  }

  // ---------- gabaritos para a tela de resultado ----------

  function gabaritoLigacao(pares) {
    const lista = el("div", "res-alternativas");
    pares.forEach((par, i) => {
      const linha = el("div", "res-par glass-panel");
      linha.style.animationDelay = `${i * 0.09}s`;
      linha.append(el("span", "esquerda", par.esquerda), el("span", "elo", "➜"), el("span", "direita", par.direita));
      lista.append(linha);
    });
    return lista;
  }

  function gabaritoClassificacao(gabarito, categoriaA, categoriaB) {
    const grupos = el("div", "res-grupos");
    for (const [chave, nome] of [["A", categoriaA], ["B", categoriaB]]) {
      const grupo = el("div", `res-grupo glass-panel ${chave.toLowerCase()}`);
      const lista = el("ul");
      for (const item of gabarito.filter((g) => g.categoria === chave)) lista.append(el("li", "", item.nome));
      grupo.append(el("h3", "", nome), lista);
      grupos.append(grupo);
    }
    return grupos;
  }

  function parar() {
    clearInterval(intervalo);
  }

  return { montarLigacao, montarClassificacao, atualizar, marcarConexao, gabaritoLigacao, gabaritoClassificacao, parar };
})();

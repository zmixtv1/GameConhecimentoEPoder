const POR_TIPO = {
  congelamento: { icone: "🧊", nome: "Congelamento" },
  gosma: { icone: "🟢", nome: "Gosma" },
  bombolha: { icone: "🫧", nome: "Bombolha" },
  mordicadores: { icone: "😬", nome: "Mordicadores" },
};

const telaLobby = document.getElementById("tela-lobby");
const telaEscolhaPorta = document.getElementById("tela-escolha-porta");
const telaPortaEscolhida = document.getElementById("tela-porta-escolhida");
const telaEscolhaPoder = document.getElementById("tela-escolha-poder");
const telaEscolhaAlvo = document.getElementById("tela-escolha-alvo");
const telaPergunta = document.getElementById("tela-pergunta");
const telaResultado = document.getElementById("tela-resultado");
const telaLinking = document.getElementById("tela-linking");
const telaResultadoLinking = document.getElementById("tela-resultado-linking");
const telaSorting = document.getElementById("tela-sorting");
const telaResultadoSorting = document.getElementById("tela-resultado-sorting");
const telaPiramide = document.getElementById("tela-piramide");
const telaResultadoPiramide = document.getElementById("tela-resultado-piramide");
const telaFim = document.getElementById("tela-fim");

const TODAS_AS_TELAS = [
  telaLobby, telaEscolhaPorta, telaPortaEscolhida,
  telaEscolhaPoder, telaEscolhaAlvo,
  telaPergunta, telaResultado,
  telaLinking, telaResultadoLinking, telaSorting, telaResultadoSorting,
  telaPiramide, telaResultadoPiramide,
  telaFim,
];

const codigoSalaEl = document.getElementById("codigo-sala");
const blocoQrcodeEl = document.getElementById("bloco-qrcode");
const entradaDivisorEl = document.getElementById("entrada-divisor");
const qrcodeImagemEl = document.getElementById("qrcode-imagem");
const listaJogadoresEl = document.getElementById("lista-jogadores");

const rodadaRotuloEl = document.getElementById("rodada-rotulo");
const portasEl = document.getElementById("portas");

const rodadaRotulo2El = document.getElementById("rodada-rotulo-2");
const categoriaEscolhidaEl = document.getElementById("categoria-escolhida");
const garantidaPorMensagemEl = document.getElementById("garantida-por-mensagem");

const progressoRodadaEl = document.getElementById("progresso-rodada");
const perguntaCategoriaEl = document.getElementById("pergunta-categoria");
const perguntaTextoEl = document.getElementById("pergunta-texto");
const faseLeituraEl = document.getElementById("fase-leitura");
const contagemLeituraEl = document.getElementById("contagem-leitura");
const timerRedondoEl = document.getElementById("timer-redondo");
const anelProgressoEl = document.getElementById("anel-progresso");
const timerNumeroEl = document.getElementById("timer-numero");
const playersDockEl = document.getElementById("players-dock");

const poderRodadaRotuloEl = document.getElementById("poder-rodada-rotulo");
const poderTempoEl = document.getElementById("poder-tempo");
const alvoTempoEl = document.getElementById("alvo-tempo");
const logPoderesEl = document.getElementById("log-poderes");

const alternativasResultadoEl = document.getElementById("alternativas-resultado");
const placarEl = document.getElementById("placar");
const placarFinalEl = document.getElementById("placar-final");
const progressoProximoEl = document.getElementById("progresso-proximo");

const linkingTemaEl = document.getElementById("linking-tema");
const linkingTempoEl = document.getElementById("linking-tempo");
const linkingProgressoEl = document.getElementById("linking-progresso");
const linkingGabaritoEl = document.getElementById("linking-gabarito");
const placarLinkingEl = document.getElementById("placar-linking");
const progressoContinuarLinkingEl = document.getElementById("progresso-continuar-linking");

const sortingCategoriasEl = document.getElementById("sorting-categorias");
const sortingTempoEl = document.getElementById("sorting-tempo");
const sortingProgressoEl = document.getElementById("sorting-progresso");
const sortingGabaritoEl = document.getElementById("sorting-gabarito");
const placarSortingEl = document.getElementById("placar-sorting");
const progressoContinuarSortingEl = document.getElementById("progresso-continuar-sorting");

const piramideTotalDegrausEl = document.getElementById("piramide-total-degraus");
const piramideCorridaEl = document.getElementById("piramide-corrida");
const piramideVencedorTituloEl = document.getElementById("piramide-vencedor-titulo");
const piramidePosicoesFinaisEl = document.getElementById("piramide-posicoes-finais");
const progressoContinuarPiramideEl = document.getElementById("progresso-continuar-piramide");

const fimTituloEl = document.getElementById("fim-titulo");

let intervaloTempo = null;
let intervaloLeitura = null;
let intervaloPoder = null;
let intervaloAlvo = null;
let intervaloLinking = null;
let intervaloSorting = null;
let portasAtuais = [];
let alternativasAtuais = [];
const CIRCUNFERENCIA_TIMER = 326.7;
const ICONE_CHECK_SVG =
  '<svg class="icone-check" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 12.5l2.5 2.5L16 9"></path></svg>';
let sortingCategoriaANome = "";
let sortingCategoriaBNome = "";
let progressoContinuarAtivoEl = null;
let piramideTotalDegraus = 0;
let jogadoresAtuais = [];

function mostrarTela(tela) {
  for (const t of TODAS_AS_TELAS) t.classList.toggle("oculto", t !== tela);
}

function renderizarJogadores(jogadores) {
  jogadoresAtuais = jogadores;
  listaJogadoresEl.innerHTML = "";
  for (const jogador of jogadores) {
    const li = document.createElement("li");
    li.textContent = jogador.nome;
    if (jogador.ehAnfitriao) li.classList.add("anfitriao");
    listaJogadoresEl.appendChild(li);
  }
}

// pódio de jogadores da tela da pergunta: cada um "pensando" até travar a
// resposta, aí acende com a cor + emoji do próprio jogador.
function renderizarPlayersDock() {
  playersDockEl.innerHTML = "";
  for (const jogador of jogadoresAtuais) {
    const pod = document.createElement("div");
    pod.className = "player-pod glass-panel thinking";
    pod.dataset.jogadorId = jogador.id;
    if (jogador.avatar) pod.style.setProperty("--cor-jogador", jogador.avatar.cor);
    pod.innerHTML = `
      <div class="ready-stamp">✓</div>
      <div class="player-avatar">${jogador.avatar ? jogador.avatar.emoji : "❔"}</div>
      <div class="player-name">${jogador.nome}</div>
    `;
    playersDockEl.appendChild(pod);
  }
}

function travarPodDoJogador(jogadorId) {
  const pod = playersDockEl.querySelector(`[data-jogador-id="${jogadorId}"]`);
  if (pod) {
    pod.classList.remove("thinking");
    pod.classList.add("locked");
  }
}

function renderizarPlacar(lista, ol) {
  ol.innerHTML = "";
  for (const jogador of lista) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${jogador.nome}</span><span>${jogador.pontos} pts</span>`;
    ol.appendChild(li);
  }
}

function iniciarContador(intervaloAntigo, elemento, tempoLimiteMs, guardarIntervalo) {
  clearInterval(intervaloAntigo);
  const inicio = Date.now();
  let novoIntervalo = null;
  const atualizar = () => {
    const restanteMs = Math.max(0, tempoLimiteMs - (Date.now() - inicio));
    elemento.textContent = `Tempo: ${Math.ceil(restanteMs / 1000)}s`;
    if (restanteMs <= 0) clearInterval(novoIntervalo);
  };
  atualizar();
  novoIntervalo = setInterval(atualizar, 200);
  guardarIntervalo(novoIntervalo);
}

function iniciarWebSocket() {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocolo}//${location.host}`);

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "identificarTv" }));
  });

  ws.addEventListener("message", (evento) => {
    tratarMensagem(JSON.parse(evento.data));
  });

  ws.addEventListener("close", () => {
    setTimeout(iniciarWebSocket, 1500);
  });
}

function tratarMensagem(msg) {
  switch (msg.type) {
    case "estadoSala": {
      codigoSalaEl.textContent = msg.codigo;
      renderizarJogadores(msg.jogadores);
      if (msg.qrCodeDataUrl) {
        qrcodeImagemEl.src = msg.qrCodeDataUrl;
        blocoQrcodeEl.classList.remove("oculto");
        entradaDivisorEl.classList.remove("oculto");
      } else {
        blocoQrcodeEl.classList.add("oculto");
        entradaDivisorEl.classList.add("oculto");
      }
      break;
    }
    case "jogadoresAtualizados": {
      renderizarJogadores(msg.jogadores);
      break;
    }
    case "escolhaPorta": {
      mostrarTela(telaEscolhaPorta);
      rodadaRotuloEl.textContent = `Rodada ${msg.rodadaAtual} de ${msg.totalRodadas}`;
      portasAtuais = msg.portas;
      portasEl.innerHTML = "";
      msg.portas.forEach((categoria) => {
        const div = document.createElement("div");
        div.className = "porta";
        div.innerHTML = `${categoria}<span class="contagem" data-contagem>0 voto(s)</span>`;
        portasEl.appendChild(div);
      });
      break;
    }
    case "progressoPortas": {
      const cartas = portasEl.querySelectorAll(".porta");
      cartas.forEach((carta, i) => {
        carta.querySelector("[data-contagem]").textContent = `${msg.contagens[i]} voto(s)`;
      });
      break;
    }
    case "portaEscolhida": {
      mostrarTela(telaPortaEscolhida);
      rodadaRotulo2El.textContent = rodadaRotuloEl.textContent;
      categoriaEscolhidaEl.textContent = msg.categoria;
      if (msg.garantidaPorNome) {
        garantidaPorMensagemEl.textContent = `🔒 ${msg.garantidaPorNome} usou o poder de garantir essa porta!`;
        garantidaPorMensagemEl.classList.remove("oculto");
      } else {
        garantidaPorMensagemEl.classList.add("oculto");
      }
      break;
    }
    case "escolhaPoder": {
      mostrarTela(telaEscolhaPoder);
      poderRodadaRotuloEl.textContent =
        `Rodada ${msg.rodadaAtual} de ${msg.totalRodadas} — Pergunta ${msg.perguntaNaRodada} de ${msg.totalPerguntasPorRodada}`;
      logPoderesEl.innerHTML = "";
      iniciarContador(intervaloPoder, poderTempoEl, msg.tempoLimiteMs, (i) => (intervaloPoder = i));
      break;
    }
    case "escolhaAlvo": {
      clearInterval(intervaloPoder);
      mostrarTela(telaEscolhaAlvo);
      iniciarContador(intervaloAlvo, alvoTempoEl, msg.tempoLimiteMs, (i) => (intervaloAlvo = i));
      break;
    }
    case "novaPergunta": {
      clearInterval(intervaloAlvo);
      alternativasAtuais = msg.alternativas;
      mostrarTela(telaPergunta);
      progressoRodadaEl.textContent =
        `Rodada ${msg.rodadaAtual} de ${msg.totalRodadas} — Pergunta ${msg.perguntaNaRodada} de ${msg.totalPerguntasPorRodada}`;
      perguntaCategoriaEl.textContent = msg.categoria;
      perguntaTextoEl.textContent = msg.pergunta;

      // as respostas só aparecem quando a revelação acontecer (tela-resultado);
      // aqui, durante a leitura e a espera das respostas, mostramos só a
      // pergunta + o timer redondo (esse ainda escondido na fase de leitura)
      // e o pódio dos jogadores, todos "pensando" até travarem a resposta.
      timerRedondoEl.classList.add("oculto");
      timerRedondoEl.classList.remove("urgente");
      playersDockEl.classList.add("oculto");
      renderizarPlayersDock();

      faseLeituraEl.classList.remove("oculto");
      clearInterval(intervaloTempo);
      clearInterval(intervaloLeitura);
      const inicioLeitura = Date.now();
      const atualizarLeitura = () => {
        const restanteMs = Math.max(0, msg.tempoLeituraMs - (Date.now() - inicioLeitura));
        contagemLeituraEl.textContent = Math.ceil(restanteMs / 1000);
        if (restanteMs <= 0) clearInterval(intervaloLeitura);
      };
      atualizarLeitura();
      intervaloLeitura = setInterval(atualizarLeitura, 200);
      break;
    }
    case "iniciarResposta": {
      // fase de resposta: some com a contagem de leitura, mostra o timer
      // redondo contando e o pódio de jogadores (todos "pensando").
      clearInterval(intervaloLeitura);
      faseLeituraEl.classList.add("oculto");
      timerRedondoEl.classList.remove("oculto");
      playersDockEl.classList.remove("oculto");

      clearInterval(intervaloTempo);
      const inicio = Date.now();
      const atualizarTimerRedondo = () => {
        const decorrido = Date.now() - inicio;
        const restanteMs = Math.max(0, msg.tempoLimiteMs - decorrido);
        const restanteS = Math.ceil(restanteMs / 1000);
        anelProgressoEl.style.strokeDashoffset =
          String(CIRCUNFERENCIA_TIMER * Math.min(1, decorrido / msg.tempoLimiteMs));
        timerNumeroEl.textContent = String(restanteS);
        timerRedondoEl.classList.toggle("urgente", restanteS <= 3 && restanteS > 0);
        if (restanteMs <= 0) clearInterval(intervaloTempo);
      };
      atualizarTimerRedondo();
      intervaloTempo = setInterval(atualizarTimerRedondo, 100);
      break;
    }
    case "progressoRespostas": {
      for (const jogadorId of msg.jogadoresQueResponderam || []) {
        travarPodDoJogador(jogadorId);
      }
      break;
    }
    case "usoDePoder": {
      const info = POR_TIPO[msg.tipo] || { icone: "⚠️", nome: msg.tipo };
      const li = document.createElement("li");
      li.textContent = `${info.icone} ${msg.deNome} usou ${info.nome} em ${msg.alvoNome}!`;
      logPoderesEl.prepend(li);
      break;
    }
    case "resultadoPergunta": {
      clearInterval(intervaloTempo);
      mostrarTela(telaResultado);

      const respostasPorAlternativa = alternativasAtuais.map(() => []);
      for (const r of msg.respostasPorJogador || []) {
        if (r.alternativaIndex !== null && respostasPorAlternativa[r.alternativaIndex]) {
          const jogador = jogadoresAtuais.find((j) => j.id === r.id);
          respostasPorAlternativa[r.alternativaIndex].push(jogador || r);
        }
      }

      alternativasResultadoEl.innerHTML = "";
      alternativasAtuais.forEach((texto, i) => {
        const ehCorreta = i === msg.respostaCorretaIndex;
        const div = document.createElement("div");
        div.className = "alternativa-resultado glass-panel" + (ehCorreta ? " correta" : "");
        div.appendChild(document.createTextNode(texto));

        const avataresCard = document.createElement("div");
        avataresCard.className = "avatares-resultado";
        respostasPorAlternativa[i].forEach((jogador, idx) => {
          const chip = document.createElement("span");
          chip.className = "avatar-chip";
          chip.textContent = jogador.avatar ? jogador.avatar.emoji : "❔";
          chip.style.background = jogador.avatar
            ? `color-mix(in srgb, ${jogador.avatar.cor} 20%, white)`
            : "var(--surface)";
          chip.style.animationDelay = `${1.5 + idx * 0.08}s`;
          avataresCard.appendChild(chip);
        });
        div.appendChild(avataresCard);

        if (ehCorreta) div.insertAdjacentHTML("beforeend", ICONE_CHECK_SVG);

        alternativasResultadoEl.appendChild(div);
      });

      renderizarPlacar(msg.placar, placarEl);
      progressoProximoEl.textContent = "Aguardando jogadores confirmarem...";
      progressoContinuarAtivoEl = progressoProximoEl;
      break;
    }

    case "iniciarLinking": {
      mostrarTela(telaLinking);
      linkingTemaEl.textContent = msg.tema;
      linkingProgressoEl.innerHTML = "";
      iniciarContador(intervaloLinking, linkingTempoEl, msg.tempoLimiteMs, (i) => (intervaloLinking = i));
      break;
    }
    case "progressoLinking": {
      linkingProgressoEl.innerHTML = "";
      for (const jogador of msg) {
        const li = document.createElement("li");
        li.innerHTML = `<span>${jogador.nome}</span><span>${jogador.corretos} pares${jogador.completou ? " ✅" : ""}</span>`;
        if (jogador.completou) li.classList.add("completou");
        linkingProgressoEl.appendChild(li);
      }
      break;
    }
    case "resultadoLinking": {
      clearInterval(intervaloLinking);
      mostrarTela(telaResultadoLinking);
      linkingGabaritoEl.innerHTML = "";
      for (const par of msg.pares) {
        const li = document.createElement("li");
        li.textContent = `${par.esquerda} → ${par.direita}`;
        linkingGabaritoEl.appendChild(li);
      }
      renderizarPlacar(msg.placar, placarLinkingEl);
      progressoContinuarLinkingEl.textContent = "Aguardando jogadores confirmarem...";
      progressoContinuarAtivoEl = progressoContinuarLinkingEl;
      break;
    }

    case "iniciarSorting": {
      mostrarTela(telaSorting);
      sortingCategoriaANome = msg.categoriaA;
      sortingCategoriaBNome = msg.categoriaB;
      sortingCategoriasEl.textContent = `${msg.categoriaA} ou ${msg.categoriaB}`;
      sortingProgressoEl.innerHTML = "";
      iniciarContador(intervaloSorting, sortingTempoEl, msg.tempoLimiteMs, (i) => (intervaloSorting = i));
      break;
    }
    case "progressoSorting": {
      sortingProgressoEl.innerHTML = "";
      for (const jogador of msg) {
        const li = document.createElement("li");
        const completou = jogador.respondidos >= jogador.total;
        li.innerHTML = `<span>${jogador.nome}</span><span>${jogador.respondidos} de ${jogador.total}${completou ? " ✅" : ""}</span>`;
        if (completou) li.classList.add("completou");
        sortingProgressoEl.appendChild(li);
      }
      break;
    }
    case "resultadoSorting": {
      clearInterval(intervaloSorting);
      mostrarTela(telaResultadoSorting);
      sortingGabaritoEl.innerHTML = "";
      for (const item of msg.gabarito) {
        const li = document.createElement("li");
        const nomeCategoria = item.categoria === "A" ? sortingCategoriaANome : sortingCategoriaBNome;
        li.textContent = `${item.nome} — ${nomeCategoria}`;
        sortingGabaritoEl.appendChild(li);
      }
      renderizarPlacar(msg.placar, placarSortingEl);
      progressoContinuarSortingEl.textContent = "Aguardando jogadores confirmarem...";
      progressoContinuarAtivoEl = progressoContinuarSortingEl;
      break;
    }

    case "iniciarPiramide": {
      mostrarTela(telaPiramide);
      piramideTotalDegraus = msg.totalDegraus;
      piramideTotalDegrausEl.textContent = `Primeiro a chegar no degrau ${msg.totalDegraus} vence a partida`;
      renderizarCorridaPiramide(msg.jogadores);
      break;
    }
    case "progressoPiramide": {
      renderizarCorridaPiramide(msg);
      break;
    }
    case "resultadoPiramide": {
      mostrarTela(telaResultadoPiramide);
      piramideVencedorTituloEl.textContent = `🏆 ${msg.vencedorNome} venceu a partida!`;
      piramidePosicoesFinaisEl.innerHTML = "";
      msg.posicoesFinais
        .slice()
        .sort((a, b) => b.posicao - a.posicao)
        .forEach((jogador) => {
          const li = document.createElement("li");
          li.innerHTML = `<span>${jogador.nome}</span><span>degrau ${jogador.posicao}</span>`;
          if (jogador.nome === msg.vencedorNome) li.classList.add("vencedor");
          piramidePosicoesFinaisEl.appendChild(li);
        });
      progressoContinuarPiramideEl.textContent = "Aguardando jogadores confirmarem...";
      progressoContinuarAtivoEl = progressoContinuarPiramideEl;
      break;
    }

    case "progressoContinuar": {
      if (progressoContinuarAtivoEl) {
        progressoContinuarAtivoEl.textContent = `${msg.confirmados} de ${msg.total} confirmaram estar prontos`;
      }
      break;
    }
    case "fimDePartida": {
      mostrarTela(telaFim);
      fimTituloEl.textContent = msg.vencedorNome ? `🏆 ${msg.vencedorNome} venceu a partida!` : "Fim de partida!";
      renderizarPlacar(msg.placarFinal, placarFinalEl);
      break;
    }
    default:
      break;
  }
}

function renderizarCorridaPiramide(jogadores) {
  piramideCorridaEl.innerHTML = "";
  for (const jogador of jogadores) {
    const pct = piramideTotalDegraus > 0 ? (jogador.posicao / piramideTotalDegraus) * 100 : 0;
    const li = document.createElement("li");
    li.className = "piramide-jogador";
    li.innerHTML = `
      <span class="piramide-nome">${jogador.nome}</span>
      <div class="piramide-barra-fundo"><div class="piramide-barra" style="width:${pct}%"></div></div>
      <span class="piramide-degrau-texto">${jogador.posicao}/${piramideTotalDegraus}</span>
    `;
    piramideCorridaEl.appendChild(li);
  }
}

iniciarWebSocket();

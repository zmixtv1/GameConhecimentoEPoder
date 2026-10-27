const telaLobby = document.getElementById("tela-lobby");
const telaEscolhaPorta = document.getElementById("tela-escolha-porta");
const telaPortaEscolhida = document.getElementById("tela-porta-escolhida");
const telaEscolhaPoder = document.getElementById("tela-escolha-poder");
const telaEscolhaAlvo = document.getElementById("tela-escolha-alvo");
const telaAnimacaoPoderes = document.getElementById("tela-animacao-poderes");
const telaPergunta = document.getElementById("tela-pergunta");
const telaResultado = document.getElementById("tela-resultado");
const telaDesafio = document.getElementById("tela-desafio");
const telaLargada = document.getElementById("tela-largada");
const telaPiramide = document.getElementById("tela-piramide");
const telaFim = document.getElementById("tela-fim");

const TODAS_AS_TELAS = [
  telaLobby, telaEscolhaPorta, telaPortaEscolhida,
  telaEscolhaPoder, telaEscolhaAlvo, telaAnimacaoPoderes,
  telaPergunta, telaResultado,
  telaDesafio,
  telaLargada, telaPiramide,
  telaFim,
];

// As telas animadas têm um módulo próprio em telas/*.js. Ao sair de uma
// delas, o módulo para os timers e animações que ainda estavam rodando.
const MODULO_DA_TELA = new Map([
  [telaAnimacaoPoderes, TelaPoderes],
  [telaResultado, TelaPontuacao],
  [telaDesafio, TelaDesafio],
  [telaLargada, TelaLargada],
  [telaPiramide, TelaCorrida],
  [telaFim, TelaPodio],
]);

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
const poderesBannerEl = document.getElementById("poderes-banner");
const poderesDockEl = document.getElementById("poderes-dock");

let intervaloTempo = null;
let intervaloLeitura = null;
let intervaloPoder = null;
let intervaloAlvo = null;
let portasAtuais = [];
let alternativasAtuais = [];
const CIRCUNFERENCIA_TIMER = 326.7;
let jogadoresAtuais = []; // na ordem de entrada na sala
let telaAtual = telaLobby;

function mostrarTela(tela) {
  if (telaAtual !== tela) {
    const modulo = MODULO_DA_TELA.get(telaAtual);
    if (modulo) modulo.parar();
  }
  telaAtual = tela;
  for (const t of TODAS_AS_TELAS) t.classList.toggle("oculto", t !== tela);
}

// "Tema 2 de 5 — Pergunta 3 de 3"
function rotuloDaPergunta(msg) {
  return `Tema ${msg.rodadaAtual} de ${msg.totalRodadas} — Pergunta ${msg.perguntaNaRodada} de ${msg.totalPerguntasPorRodada}`;
}

// cria um elemento com texto (textContent: o nome do jogador nunca é
// interpretado como HTML)
function criarEl(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// monta um pod (squircle do teste.html): selo de pronto, animal e nome
function criarPod(jogador, classesExtras) {
  const pod = criarEl("div", `player-pod glass-panel ${classesExtras || ""}`.trim());
  if (jogador.conectado === false) pod.classList.add("desconectado");
  pod.dataset.jogadorId = jogador.id;
  if (jogador.avatar) pod.style.setProperty("--cor-jogador", jogador.avatar.cor);
  pod.appendChild(criarEl("div", "ready-stamp", "✓"));
  pod.appendChild(criarEl("div", "player-avatar", jogador.avatar ? jogador.avatar.emoji : "❔"));
  pod.appendChild(criarEl("div", "player-name", jogador.nome));
  return pod;
}

// lobby: cada jogador aparece com o animal que escolheu (ou "❔" enquanto não escolhe)
function renderizarJogadores(jogadores) {
  jogadoresAtuais = jogadores;
  listaJogadoresEl.innerHTML = "";
  for (const jogador of jogadores) {
    const extras = [jogador.avatar ? "" : "sem-animal", jogador.ehAnfitriao ? "anfitriao" : ""].join(" ");
    listaJogadoresEl.appendChild(criarPod(jogador, extras));
  }
}

// pódio de jogadores da tela da pergunta: cada um "pensando" até travar a
// resposta, aí acende com a cor + emoji do próprio jogador.
function renderizarPlayersDock() {
  playersDockEl.innerHTML = "";
  for (const jogador of jogadoresAtuais) {
    playersDockEl.appendChild(criarPod(jogador, "thinking"));
  }
}

function travarPodDoJogador(jogadorId) {
  const pod = playersDockEl.querySelector(`[data-jogador-id="${jogadorId}"]`);
  if (pod) {
    pod.classList.remove("thinking");
    pod.classList.add("locked");
  }
}

// Linha embaixo do nome no placar do desafio: "5 de 5 pares", verde se fez tudo
function acertosDoDesafio(unidade) {
  return (jogador) => {
    if (jogador.acertos === undefined) return null;
    const completo = jogador.acertos >= jogador.total;
    return criarEl(
      "span",
      `acertos-desafio${completo ? " completo" : ""}`,
      `${completo ? "✓ " : ""}${jogador.acertos} de ${jogador.total} ${unidade}`
    );
  };
}

// "4 de 6 ligaram tudo" / "Só Ana acertou todos!"
function resumoDoDesafio(placar, singular, plural) {
  const completos = placar.filter((j) => j.acertos !== undefined && j.acertos >= j.total);
  if (completos.length === 0) return "Ninguém fez tudo dessa vez!";
  if (completos.length === placar.length) return `Todo mundo ${singular}! 🎉`;
  if (completos.length === 1) return `Só ${completos[0].nome} ${singular}!`;
  return `${completos.length} de ${placar.length} ${plural}`;
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
    case "voltouAoLobby": {
      // volta pra tela do código/QR, pronta pra outra partida
      for (const i of [intervaloTempo, intervaloLeitura, intervaloPoder, intervaloAlvo]) {
        clearInterval(i);
      }
      renderizarJogadores(msg.jogadores);
      mostrarTela(telaLobby);
      break;
    }
    case "jogadoresAtualizados": {
      renderizarJogadores(msg.jogadores);
      // quem caiu no meio da partida aparece apagado no pódio, até voltar
      for (const jogador of msg.jogadores) {
        const pod = playersDockEl.querySelector(`[data-jogador-id="${jogador.id}"]`);
        if (pod) pod.classList.toggle("desconectado", jogador.conectado === false);
      }
      if (telaAtual === telaPiramide) TelaCorrida.marcarConexao(msg.jogadores);
      if (telaAtual === telaDesafio) TelaDesafio.marcarConexao(msg.jogadores);
      break;
    }
    case "escolhaPorta": {
      mostrarTela(telaEscolhaPorta);
      rodadaRotuloEl.textContent = `Tema ${msg.rodadaAtual} de ${msg.totalRodadas}`;
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
      poderRodadaRotuloEl.textContent = rotuloDaPergunta(msg);
      iniciarContador(intervaloPoder, poderTempoEl, msg.tempoLimiteMs, (i) => (intervaloPoder = i));
      break;
    }
    case "escolhaAlvo": {
      clearInterval(intervaloPoder);
      mostrarTela(telaEscolhaAlvo);
      iniciarContador(intervaloAlvo, alvoTempoEl, msg.tempoLimiteMs, (i) => (intervaloAlvo = i));
      break;
    }
    case "animacaoPoderes": {
      // quem atacou quem, um momento por jogador que usou poder
      clearInterval(intervaloPoder);
      clearInterval(intervaloAlvo);
      mostrarTela(telaAnimacaoPoderes);
      TelaPoderes.montar(msg, {
        tela: telaAnimacaoPoderes,
        banner: poderesBannerEl,
        dock: poderesDockEl,
        criarPod,
      });
      break;
    }
    case "novaPergunta": {
      clearInterval(intervaloPoder);
      clearInterval(intervaloAlvo);
      alternativasAtuais = msg.alternativas;
      mostrarTela(telaPergunta);
      progressoRodadaEl.textContent = rotuloDaPergunta(msg);
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
    case "resultadoPergunta": {
      clearInterval(intervaloTempo);
      mostrarTela(telaResultado);
      // (a TV que reconectou no meio da partida não viu a pergunta: o texto das
      // alternativas vem junto com o resultado)
      if (msg.alternativas) alternativasAtuais = msg.alternativas;
      TelaPontuacao.montar(msg, { alternativas: alternativasAtuais, jogadores: jogadoresAtuais });
      break;
    }

    // ---- desafio do tema: durante, no molde da pergunta ----
    case "iniciarLinking": {
      mostrarTela(telaDesafio);
      TelaDesafio.montarLigacao(msg, { jogadores: jogadoresAtuais, criarPod });
      break;
    }
    case "iniciarSorting": {
      mostrarTela(telaDesafio);
      TelaDesafio.montarClassificacao(msg, { jogadores: jogadoresAtuais, criarPod });
      break;
    }
    case "progressoLinking":
    case "progressoSorting": {
      TelaDesafio.atualizar(msg.jogadores);
      break;
    }

    // ---- e o resultado, na tela de placar da pergunta ----
    case "resultadoLinking": {
      mostrarTela(telaResultado);
      TelaPontuacao.montarDesafio({
        rotulo: "Resultado da Ligação",
        titulo: msg.tema || "Ligação",
        subtitulo: resumoDoDesafio(msg.placar, "ligou tudo", "ligaram tudo"),
        gabarito: TelaDesafio.gabaritoLigacao(msg.pares),
        placar: msg.placar,
        detalhe: acertosDoDesafio("pares"),
      });
      break;
    }
    case "resultadoSorting": {
      mostrarTela(telaResultado);
      TelaPontuacao.montarDesafio({
        rotulo: "Resultado da Classificação",
        titulo: `${msg.categoriaA} ou ${msg.categoriaB}`,
        subtitulo: resumoDoDesafio(msg.placar, "acertou todos", "acertaram todos"),
        gabarito: TelaDesafio.gabaritoClassificacao(msg.gabarito, msg.categoriaA, msg.categoriaB),
        placar: msg.placar,
        detalhe: acertosDoDesafio("itens"),
      });
      break;
    }

    // a pontuação de cada um virando o andar de largada
    case "largadaPiramide": {
      mostrarTela(telaLargada);
      TelaLargada.montar(msg, jogadoresAtuais);
      break;
    }
    case "iniciarPiramide": {
      mostrarTela(telaPiramide);
      TelaCorrida.montar(msg, jogadoresAtuais);
      break;
    }
    case "progressoPiramide": {
      TelaCorrida.atualizar(msg);
      break;
    }
    case "vencedorPiramide": {
      TelaCorrida.vencedor(msg);
      break;
    }

    case "progressoContinuar": {
      // toda tela com "continuar" (pergunta e desafios) é a de placar
      if (telaAtual === telaResultado) TelaPontuacao.mostrarProgresso(msg.confirmados, msg.total);
      break;
    }
    case "fimDePartida": {
      // na TV, só o pódio; o placar das rodadas aparece nos celulares
      mostrarTela(telaFim);
      TelaPodio.montar(msg);
      break;
    }
    default:
      break;
  }
}

// a pirâmide é desenhada no tamanho da tela: mudou o tamanho, redesenha
window.addEventListener("resize", () => {
  if (telaAtual === telaLargada) TelaLargada.redimensionar();
  if (telaAtual === telaPiramide) TelaCorrida.redimensionar();
});

iniciarWebSocket();

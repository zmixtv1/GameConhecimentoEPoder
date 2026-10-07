// cada tela de resultado tem seu próprio bloco "Sua posição" (mesmos campos,
// ids com sufixo diferente)
function elementosDePosicao(sufixo) {
  return {
    numero: document.getElementById(`posicao-numero${sufixo}`),
    pontos: document.getElementById(`posicao-pontos${sufixo}`),
    diferenca: document.getElementById(`posicao-diferenca${sufixo}`),
  };
}

const POR_TIPO = {
  congelamento: { icone: "🧊", nome: "Congelamento" },
  gosma: { icone: "🟢", nome: "Gosma" },
  bombolha: { icone: "🫧", nome: "Bombolha" },
  mordicadores: { icone: "😬", nome: "Mordicadores" },
};

const telaEntrada = document.getElementById("tela-entrada");
const telaAnimal = document.getElementById("tela-animal");
const telaAguardando = document.getElementById("tela-aguardando");
const telaEscolhaPorta = document.getElementById("tela-escolha-porta");
const telaAguardandoPorta = document.getElementById("tela-aguardando-porta");
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
  telaEntrada, telaAnimal, telaAguardando, telaEscolhaPorta, telaAguardandoPorta,
  telaEscolhaPoder, telaEscolhaAlvo,
  telaPergunta, telaResultado,
  telaLinking, telaResultadoLinking, telaSorting, telaResultadoSorting,
  telaPiramide, telaResultadoPiramide,
  telaFim,
];

const campoNome = document.getElementById("campo-nome");
const campoCodigo = document.getElementById("campo-codigo");
const botaoEntrar = document.getElementById("botao-entrar");
const mensagemErroEl = document.getElementById("mensagem-erro");

// quem entrou escaneando o QR code da TV já chega com o código na URL
// (?codigo=ABCD) - preenche pra não precisar digitar.
const codigoDaUrl = new URLSearchParams(location.search).get("codigo");
if (codigoDaUrl) campoCodigo.value = codigoDaUrl.toUpperCase();

const animaisGridEl = document.getElementById("animais-grid");
const listaJogadoresEl = document.getElementById("lista-jogadores");
const aguardandoStatusEl = document.getElementById("aguardando-status");
const botaoIniciar = document.getElementById("botao-iniciar");
const botaoTrocarAnimal = document.getElementById("botao-trocar-animal");
const botaoVoltarInicio = document.getElementById("botao-voltar-inicio");
const avisoFimPartidaEl = document.getElementById("aviso-fim-partida");
const aguardandoTituloEl = document.getElementById("aguardando-titulo");
const animalSubtituloEl = document.getElementById("animal-subtitulo");
const avisoGirarEl = document.getElementById("aviso-girar");
const fecharAvisoGirarEl = document.getElementById("fechar-aviso-girar");
const identidadePerguntaEl = document.getElementById("identidade-pergunta");
const rodadaRotuloEl = document.getElementById("rodada-rotulo");
const anelPortaEl = document.getElementById("anel-porta");
const numeroPortaEl = document.getElementById("numero-porta");
const opcaoGarantirPortaEl = document.getElementById("opcao-garantir-porta");
const checkboxGarantirPortaEl = document.getElementById("checkbox-garantir-porta");
const poderPortaUsadoMsgEl = document.getElementById("poder-porta-usado-msg");
const portasEl = document.getElementById("portas");
const aguardandoPortaTituloEl = document.getElementById("aguardando-porta-titulo");
const aguardandoPortaTextoEl = document.getElementById("aguardando-porta-texto");
const aguardandoPortaTemaEl = document.getElementById("aguardando-porta-tema");
const aguardandoPortaAvisoEl = document.getElementById("aguardando-porta-aviso");

const progressoRodadaEl = document.getElementById("progresso-rodada");
const perguntaCategoriaEl = document.getElementById("pergunta-categoria");
const perguntaTextoEl = document.getElementById("pergunta-texto");
const areaAlternativasEl = document.getElementById("area-alternativas");
const alternativasEl = document.getElementById("alternativas");
const anelPerguntaEl = document.getElementById("anel-pergunta");
const numeroPerguntaEl = document.getElementById("numero-pergunta");
const faseLeituraEl = document.getElementById("fase-leitura");
const contagemLeituraEl = document.getElementById("contagem-leitura");

const poderRodadaRotuloEl = document.getElementById("poder-rodada-rotulo");
const anelPoderEl = document.getElementById("anel-poder");
const numeroPoderEl = document.getElementById("numero-poder");
const poderTiposEl = document.getElementById("poder-tipos");

const alvoTituloEl = document.getElementById("alvo-titulo");
const anelAlvoEl = document.getElementById("anel-alvo");
const numeroAlvoEl = document.getElementById("numero-alvo");
const alvoListaEl = document.getElementById("alvo-lista");
const alvoUsadoMsgEl = document.getElementById("alvo-usado-msg");

const avisoAtingidoEl = document.getElementById("aviso-atingido");
const avisoConexaoEl = document.getElementById("aviso-conexao");
const modalReiniciarEl = document.getElementById("modal-reiniciar");
const botaoConfirmarReiniciarEl = document.getElementById("botao-confirmar-reiniciar");
const botaoCancelarReiniciarEl = document.getElementById("botao-cancelar-reiniciar");
const obstrucaoEl = document.getElementById("obstrucao");

const resultadoTituloEl = document.getElementById("resultado-titulo");
const resultadoPontosEl = document.getElementById("resultado-pontos");
const posicaoPerguntaEls = elementosDePosicao("");
const posicaoFinalEls = elementosDePosicao("-final");
const botaoProxima = document.getElementById("botao-proxima");
const statusProximoEl = document.getElementById("status-proximo");

const linkingTemaEl = document.getElementById("linking-tema");
const linkingTituloEl = document.getElementById("linking-titulo");
const anelLinkingEl = document.getElementById("anel-linking");
const numeroLinkingEl = document.getElementById("numero-linking");
const linkingListaEl = document.getElementById("linking-lista");
const linkingProgressoEl = document.getElementById("linking-progresso");
const linkingPontosEl = document.getElementById("linking-pontos");
const linkingGabaritoEl = document.getElementById("linking-gabarito");
const posicaoLinkingEls = elementosDePosicao("-linking");
const botaoContinuarLinking = document.getElementById("botao-continuar-linking");
const statusContinuarLinkingEl = document.getElementById("status-continuar-linking");

const anelSortingEl = document.getElementById("anel-sorting");
const numeroSortingEl = document.getElementById("numero-sorting");
const sortingCategoriasEl = document.getElementById("sorting-categorias");
const sortingItensEl = document.getElementById("sorting-itens");
const sortingProgressoEl = document.getElementById("sorting-progresso");
const sortingPontosEl = document.getElementById("sorting-pontos");
const sortingGabaritoEl = document.getElementById("sorting-gabarito");
const posicaoSortingEls = elementosDePosicao("-sorting");
const botaoContinuarSorting = document.getElementById("botao-continuar-sorting");
const statusContinuarSortingEl = document.getElementById("status-continuar-sorting");

const piramideDegrauEl = document.getElementById("piramide-degrau");
const piramideCategoriaEl = document.getElementById("piramide-categoria");
const piramidePerguntaEl = document.getElementById("piramide-pergunta");
const piramideAlternativasEl = document.getElementById("piramide-alternativas");
const piramideVencedorTituloEl = document.getElementById("piramide-vencedor-titulo");
const piramidePosicoesFinaisEl = document.getElementById("piramide-posicoes-finais");
const botaoContinuarPiramide = document.getElementById("botao-continuar-piramide");
const statusContinuarPiramideEl = document.getElementById("status-continuar-piramide");

const fimTituloEl = document.getElementById("fim-titulo");

let ws = null;
let meuJogadorId = null;
let meuAvatar = null;
let meuNome = "";
let animaisDisponiveis = []; // [{ id, nome, emoji, cor }], enviado pelo servidor ao entrar
let jogadoresNaSala = []; // última lista pública de jogadores recebida
let telaAtual = null;
let souAnfitriao = false;
let jaRespondeuEstaRodada = false;
let jaEscolheuPorta = false;
let jaEscolheuTipoPoder = false;
let jaEscolheuAlvo = false;
let intervaloLeitura = null;
let intervaloPergunta = null;
let intervaloPorta = null;
let intervaloPoder = null;
let intervaloAlvo = null;
let alternativasBrutas = [];
let efeitosAtivosAtuais = [];
let timeoutAvisoAtingido = null;

// confirmação genérica de "continuar" (usada depois de pergunta, Linking e Sorting)
let jaConfirmouContinuar = false;
let statusContinuarAtivoEl = null;

// estado do Linking
let linkingEsquerdaTextos = [];
let linkingDireitaTextos = [];
let linkingCorretosSet = new Set();
let linkingDireitaUsada = new Set();
let linkingTotalPares = 0;
let intervaloLinking = null;

// estado do Sorting
let sortingRespondidos = 0;
let sortingTotalItens = 0;
let sortingCategoriaANome = "";
let sortingCategoriaBNome = "";
let intervaloSorting = null;
// sem scroll: mostra só 3 itens por vez e revela os próximos 3 conforme
// esses vão sendo respondidos.
const ITENS_POR_LOTE_SORTING = 3;
let sortingLoteAtual = 0;

// estado da Pirâmide
let piramideTotalDegraus = 0;
let piramideJaRespondeu = false;

// zera todos os contadores de tempo que possam estar rodando
function pararContadores() {
  for (const i of [intervaloLeitura, intervaloPergunta, intervaloPorta, intervaloPoder,
                   intervaloAlvo, intervaloLinking, intervaloSorting]) {
    clearInterval(i);
  }
  clearTimeout(timeoutAvisoAtingido);
  avisoAtingidoEl.classList.add("oculto");
}

function mostrarTela(tela) {
  telaAtual = tela;
  for (const t of TODAS_AS_TELAS) t.classList.toggle("oculto", t !== tela);
}

// cria um elemento com texto (textContent: o nome do jogador nunca é
// interpretado como HTML)
function criarEl(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Em vez da lista inteira, o celular mostra só a posição do próprio jogador,
// a pontuação dele e quanto falta pra passar quem está logo acima.
// O placar chega do servidor já ordenado do maior pro menor.
function renderizarMinhaPosicao(placar, els) {
  const eu = placar.find((j) => j.id === meuJogadorId);
  if (!eu) return;

  // empate = mesma posição (dois com a maior pontuação são os dois "1º")
  const posicao = placar.filter((j) => j.pontos > eu.pontos).length + 1;
  els.numero.textContent = `${posicao}º`;
  els.pontos.textContent = `${eu.pontos} pts`;

  // quem está acima é o primeiro com MAIS pontos que eu (ignora os empatados)
  const acima = [...placar].reverse().find((j) => j.pontos > eu.pontos);
  if (acima) {
    // +1 porque empatar não é passar
    const faltam = acima.pontos - eu.pontos + 1;
    els.diferenca.textContent = `Faltam ${faltam} ${faltam === 1 ? "ponto" : "pontos"} para passar ${acima.nome}`;
    els.diferenca.classList.remove("oculto");
  } else {
    els.diferenca.classList.add("oculto"); // 1º lugar: não tem ninguém acima
  }
}

// `jaConfirmou` vem do servidor quando o jogador volta de uma queda na tela de
// resultado e já tinha apertado "continuar" antes de cair.
function prepararTelaResultado(botao, statusEl, jaConfirmou = false) {
  jaConfirmouContinuar = !!jaConfirmou;
  botao.disabled = !!jaConfirmou;
  statusEl.classList.toggle("oculto", !jaConfirmou);
  statusEl.textContent = jaConfirmou ? "Aguardando os outros jogadores..." : "";
  statusContinuarAtivoEl = statusEl;
}

function confirmarContinuar(botao) {
  if (jaConfirmouContinuar) return;
  jaConfirmouContinuar = true;
  botao.disabled = true;
  statusContinuarAtivoEl.classList.remove("oculto");
  statusContinuarAtivoEl.textContent = "Aguardando os outros jogadores...";
  enviarAoServidor({ type: "continuar" });
}

// ---------- sessão e reconexão ----------
// Ao entrar, o servidor dá um token. Guardado aqui, ele permite voltar pro
// mesmo lugar da partida se a conexão cair (tela apagou, Wi-Fi oscilou...).

const CHAVE_SESSAO = "dps_sessao";
const VALIDADE_SESSAO_MS = 30 * 60 * 1000;
const INTERVALO_RECONEXAO_MS = 2000;
// o servidor guarda a vaga por 60s depois de perceber a queda (o que leva até
// ~20s); passado esse tempo não adianta mais insistir
const DESISTIR_RECONEXAO_MS = 85000;

let sessaoAtiva = false; // já entrou (ou reconectou) com sucesso nesta página
let tentandoReconectar = false;
let desistirReconexaoEm = 0;
let timerReconexao = null;

function lerSessao() {
  try {
    const sessao = JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    if (sessao && sessao.token && sessao.codigoSala && Date.now() - sessao.salvoEm < VALIDADE_SESSAO_MS) {
      return sessao;
    }
  } catch { /* sem localStorage ou conteúdo inválido: segue sem sessão */ }
  return null;
}

function salvarSessao(token, codigoSala) {
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token, codigoSala, salvoEm: Date.now() }));
  } catch { /* modo privado etc: só não vai conseguir reconectar */ }
}

function limparSessao() {
  try { localStorage.removeItem(CHAVE_SESSAO); } catch { /* ignora */ }
}

function mostrarAvisoConexao(texto) {
  avisoConexaoEl.classList.toggle("oculto", !texto);
  if (texto) avisoConexaoEl.textContent = texto;
}

// Manda uma ação do jogador. Se a conexão caiu (e está reconectando) a ação é
// descartada: quando a conexão volta, o servidor reenvia a tela com o estado
// verdadeiro e o jogador refaz o toque.
function enviarAoServidor(objeto) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(objeto));
}

// Fecha a conexão atual sem que o "close" dela dispare outra tentativa
function largarConexaoAtual() {
  const socket = ws;
  ws = null;
  if (socket) socket.close();
}

function voltarParaEntrada(mensagem) {
  clearTimeout(timerReconexao);
  tentandoReconectar = false;
  sessaoAtiva = false;
  limparSessao();
  mostrarAvisoConexao(null);
  largarConexaoAtual();
  mostrarTela(telaEntrada);
  mensagemErroEl.textContent = mensagem;
}

function agendarReconexao() {
  if (!tentandoReconectar) {
    tentandoReconectar = true;
    desistirReconexaoEm = Date.now() + DESISTIR_RECONEXAO_MS;
  }
  if (Date.now() > desistirReconexaoEm) {
    voltarParaEntrada("Não foi possível reconectar. Entre na sala de novo.");
    return;
  }
  mostrarAvisoConexao("📡 Conexão perdida. Reconectando…");
  clearTimeout(timerReconexao);
  timerReconexao = setTimeout(() => conectar("reconectar"), INTERVALO_RECONEXAO_MS);
}

function conectar(modo = "entrar") {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocolo}//${location.host}`);
  ws = socket;

  socket.addEventListener("open", () => {
    if (modo === "reconectar") {
      const sessao = lerSessao();
      if (!sessao) {
        voltarParaEntrada("");
        return;
      }
      socket.send(JSON.stringify({ type: "reconectar", token: sessao.token, codigoSala: sessao.codigoSala }));
    } else {
      socket.send(JSON.stringify({
        type: "entrar",
        nome: campoNome.value.trim(),
        codigoSala: campoCodigo.value.trim(),
      }));
    }
  });

  socket.addEventListener("message", (evento) => {
    if (socket !== ws) return; // conexão antiga já substituída
    tratarMensagem(JSON.parse(evento.data));
  });

  socket.addEventListener("close", () => {
    if (socket !== ws) return; // fechamos de propósito (ou já há uma conexão nova)
    if (sessaoAtiva || tentandoReconectar) {
      agendarReconexao();
    } else {
      mensagemErroEl.textContent = "Conexão perdida. Recarregue a página.";
    }
  });
}

// voltou pro app (tirou o celular do bolso, destravou a tela): não espera o
// próximo ciclo, tenta reconectar já se a conexão não estiver aberta
document.addEventListener("visibilitychange", () => {
  if (document.hidden || !(sessaoAtiva || tentandoReconectar)) return;
  const aberta = ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
  if (!aberta) {
    clearTimeout(timerReconexao);
    conectar("reconectar");
  }
});

function tratarMensagem(msg) {
  switch (msg.type) {
    case "erroEntrada": {
      largarConexaoAtual();
      mensagemErroEl.textContent = msg.mensagem;
      break;
    }
    case "erroReconexao": {
      // a vaga na partida não existe mais (passou o prazo ou o servidor reiniciou)
      voltarParaEntrada(msg.mensagem);
      break;
    }
    case "reconectado": {
      sessaoAtiva = true;
      tentandoReconectar = false;
      clearTimeout(timerReconexao);
      mostrarAvisoConexao(null);
      meuJogadorId = msg.jogadorId;
      animaisDisponiveis = msg.animais || [];
      atualizarLobby(msg.jogadores);
      // durante a partida o servidor reenvia a tela da fase logo em seguida;
      // no lobby, volta pra escolha de animal ou pra espera
      if (msg.estado === "lobby") {
        const eu = msg.jogadores.find((j) => j.id === meuJogadorId);
        mostrarTela(eu && eu.animalId ? telaAguardando : telaAnimal);
      }
      break;
    }
    case "erroAcao": {
      alert(msg.mensagem);
      break;
    }
    case "entrouComSucesso": {
      aguardandoTituloEl.textContent = "Você entrou!";
      animalSubtituloEl.textContent = "Cada animal é de um jogador só";
      sessaoAtiva = true;
      salvarSessao(msg.token, campoCodigo.value.trim().toUpperCase());
      meuJogadorId = msg.jogadorId;
      animaisDisponiveis = msg.animais || [];
      atualizarLobby(msg.jogadores);
      mostrarTela(telaAnimal); // primeiro escolhe o animal, depois espera o início
      break;
    }
    case "jogadoresAtualizados": {
      atualizarLobby(msg.jogadores);
      break;
    }
    case "voltouAoLobby": {
      fecharModalReiniciar();
      // a partida acabou (ou foi encerrada por falta de gente): volta pro
      // início, já com o animal que a pessoa tinha escolhido
      pararContadores();
      atualizarLobby(msg.jogadores);
      avisoFimPartidaEl.classList.toggle("oculto", !msg.motivo);
      if (msg.motivo) avisoFimPartidaEl.textContent = msg.motivo;
      aguardandoTituloEl.textContent = "Pronto pra jogar de novo!";
      // o controle volta pra tela principal (escolher o animal); quem já tinha
      // um continua com ele marcado, é só tocar de novo pra confirmar
      animalSubtituloEl.textContent = msg.motivo || "Confirme ou troque seu animal";
      mostrarTela(telaAnimal);
      break;
    }
    case "animalEscolhido": {
      mostrarTela(telaAguardando);
      break;
    }
    case "escolhaPorta": {
      jaEscolheuPorta = false;
      avisoFimPartidaEl.classList.add("oculto");
      aguardandoPortaTituloEl.textContent = "Voto registrado!";
      aguardandoPortaTextoEl.classList.remove("oculto");
      aguardandoPortaTemaEl.classList.add("oculto");
      aguardandoPortaAvisoEl.classList.add("oculto");
      mostrarTela(telaEscolhaPorta);
      rodadaRotuloEl.textContent = `Rodada ${msg.rodadaAtual} de ${msg.totalRodadas}`;
      portasEl.innerHTML = "";
      msg.portas.forEach((categoria, i) => {
        const btn = document.createElement("button");
        btn.className = "alternativa";
        btn.textContent = categoria;
        btn.addEventListener("click", () => escolherPorta(i, btn));
        portasEl.appendChild(btn);
      });
      checkboxGarantirPortaEl.checked = false;
      checkboxGarantirPortaEl.disabled = false;
      opcaoGarantirPortaEl.classList.toggle("oculto", !msg.poderPortaDisponivel);
      poderPortaUsadoMsgEl.classList.toggle("oculto", !!msg.poderPortaDisponivel);
      iniciarContadorRedondo(intervaloPorta, anelPortaEl, numeroPortaEl, msg.tempoLimiteMs, (i) => (intervaloPorta = i));
      if (msg.jaEscolheu) {
        // voltou de uma queda depois de já ter votado
        jaEscolheuPorta = true;
        mostrarTela(telaAguardandoPorta);
      }
      break;
    }
    case "portaEscolhida": {
      // a porta pode ser decidida antes do tempo acabar (quando alguém usa o
      // poder de garantir), então quem ainda estava escolhendo sai da tela de
      // portas agora e todo mundo já vê o tema da rodada.
      clearInterval(intervaloPorta);
      jaEscolheuPorta = true;
      aguardandoPortaTituloEl.textContent = "Tema da rodada";
      aguardandoPortaTextoEl.classList.add("oculto");
      aguardandoPortaTemaEl.textContent = msg.categoria;
      aguardandoPortaTemaEl.classList.remove("oculto");
      aguardandoPortaAvisoEl.classList.toggle("oculto", !msg.garantidaPorNome);
      if (msg.garantidaPorNome) {
        aguardandoPortaAvisoEl.textContent = `🔒 ${msg.garantidaPorNome} garantiu essa porta!`;
      }
      mostrarTela(telaAguardandoPorta);
      break;
    }
    case "poderPortaDevolvido": {
      // alguém garantiu a porta milésimos antes: o poder deste jogador não foi
      // usado e continua disponível nas próximas rodadas
      aguardandoPortaAvisoEl.textContent = msg.garantidaPorNome
        ? `🔒 ${msg.garantidaPorNome} garantiu primeiro — seu poder não foi usado, você ainda tem ele!`
        : "A porta já tinha sido decidida — seu poder não foi usado, você ainda tem ele!";
      aguardandoPortaAvisoEl.classList.remove("oculto");
      break;
    }
    case "escolhaPoder": {
      jaEscolheuTipoPoder = false;
      clearTimeout(timeoutAvisoAtingido);
      avisoAtingidoEl.classList.add("oculto");

      mostrarTela(telaEscolhaPoder);
      poderRodadaRotuloEl.textContent =
        `Rodada ${msg.rodadaAtual} de ${msg.totalRodadas} — Pergunta ${msg.perguntaNaRodada} de ${msg.totalPerguntasPorRodada}`;
      poderTiposEl.innerHTML = "";
      msg.tiposDisponiveis.forEach((tipo) => {
        const info = POR_TIPO[tipo] || { icone: "❔", nome: tipo };
        const btn = document.createElement("button");
        btn.className = "alternativa";
        btn.textContent = `${info.icone} ${info.nome}`;
        btn.addEventListener("click", () => escolherTipoPoder(tipo, btn));
        poderTiposEl.appendChild(btn);
      });
      iniciarContadorRedondo(intervaloPoder, anelPoderEl, numeroPoderEl, msg.tempoLimiteMs, (i) => (intervaloPoder = i));
      if (msg.jaEscolheu) {
        jaEscolheuTipoPoder = true;
        document.querySelectorAll("#poder-tipos .alternativa").forEach((b) => (b.disabled = true));
      }
      break;
    }
    case "escolhaAlvo": {
      clearInterval(intervaloPoder);
      jaEscolheuAlvo = false;
      alvoUsadoMsgEl.classList.add("oculto");
      alvoUsadoMsgEl.textContent = "";
      alvoListaEl.innerHTML = "";

      mostrarTela(telaEscolhaAlvo);
      if (msg.temPoder) {
        const info = POR_TIPO[msg.tipo] || { icone: "❔", nome: msg.tipo };
        alvoTituloEl.textContent = `Usar ${info.icone} ${info.nome} em quem?`;
        msg.alvosPossiveis.forEach((alvo) => {
          const btn = document.createElement("button");
          btn.className = "poder-alvo-btn";
          btn.textContent = alvo.nome;
          btn.addEventListener("click", () => escolherAlvo(alvo.id, btn));
          alvoListaEl.appendChild(btn);
        });
      } else {
        alvoTituloEl.textContent = msg.jaUsou ? "Poder já usado!" : "Você não tem poder nesta pergunta";
        jaEscolheuAlvo = true; // nada a fazer aqui, só aguardar
      }
      iniciarContadorRedondo(intervaloAlvo, anelAlvoEl, numeroAlvoEl, msg.tempoLimiteMs, (i) => (intervaloAlvo = i));
      break;
    }
    case "novaPergunta": {
      jaRespondeuEstaRodada = false;
      identidadePerguntaEl.classList.remove("voted");
      efeitosAtivosAtuais = [];
      alternativasBrutas = msg.alternativas;

      // o timer da resposta só começa a contar quando a leitura acabar
      clearInterval(intervaloPergunta);
      anelPerguntaEl.style.strokeDashoffset = "0";
      numeroPerguntaEl.textContent = "";
      anelPerguntaEl.closest(".timer-redondo-mini").classList.remove("urgente");

      clearInterval(intervaloAlvo);
      mostrarTela(telaPergunta);
      progressoRodadaEl.textContent =
        `Rodada ${msg.rodadaAtual} de ${msg.totalRodadas} — Pergunta ${msg.perguntaNaRodada} de ${msg.totalPerguntasPorRodada}`;
      perguntaCategoriaEl.textContent = msg.categoria;
      perguntaTextoEl.textContent = msg.pergunta;

      // as alternativas só aparecem quando o tempo de leitura acabar
      // (em "iniciarResposta"); até lá, ficam escondidas de propósito.
      areaAlternativasEl.classList.add("oculto");
      alternativasEl.innerHTML = "";
      obstrucaoEl.classList.add("oculto");
      obstrucaoEl.innerHTML = "";

      // fase de leitura: mostra contagem regressiva, botões travados
      faseLeituraEl.classList.remove("oculto");
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
    case "atingidoPorPoder": {
      efeitosAtivosAtuais = msg.efeitosAtivos;
      const info = POR_TIPO[msg.tipo] || { icone: "⚠️", nome: msg.tipo };
      avisoAtingidoEl.textContent = `${info.icone} ${msg.deNome} usou ${info.nome} em você!`;
      avisoAtingidoEl.classList.remove("oculto");
      clearTimeout(timeoutAvisoAtingido);
      timeoutAvisoAtingido = setTimeout(() => avisoAtingidoEl.classList.add("oculto"), 5000);
      break;
    }
    case "iniciarResposta": {
      clearInterval(intervaloLeitura);
      faseLeituraEl.classList.add("oculto");
      efeitosAtivosAtuais = msg.efeitosAtivos || [];

      const mordidas = efeitosAtivosAtuais.filter((e) => e.tipo === "mordicadores").length;
      renderizarAlternativas(alternativasBrutas, mordidas);
      areaAlternativasEl.classList.remove("oculto");

      if (msg.respostaDada !== null && msg.respostaDada !== undefined) {
        // voltou de uma queda depois de já ter respondido: mostra a escolha dele travada
        jaRespondeuEstaRodada = true;
        document.querySelectorAll("#alternativas .alternativa").forEach((b) => (b.disabled = true));
        const escolhido = alternativasEl.children[msg.respostaDada];
        if (escolhido) escolhido.classList.add("selecionada");
        identidadePerguntaEl.classList.add("voted");
        obstrucaoEl.classList.add("oculto");
      } else {
        montarObstrucao(efeitosAtivosAtuais);
      }
      iniciarContadorRedondo(intervaloPergunta, anelPerguntaEl, numeroPerguntaEl, msg.tempoLimiteMs, (i) => (intervaloPergunta = i));
      break;
    }
    case "resultadoPergunta": {
      // primeiro pisca a resposta certa em cima do próprio grid de
      // alternativas (o jogador ainda está na tela-pergunta), só depois
      // troca pra tela de resultado com o placar e o botão de continuar.
      // quem não respondeu a tempo ainda tinha os botões habilitados -
      // trava tudo agora pra não mandar "responder" depois que o servidor
      // já saiu da fase de pergunta (isso virava um alert() de erro no meio
      // da revelação).
      clearInterval(intervaloPergunta);
      document.querySelectorAll("#alternativas .alternativa").forEach((b) => (b.disabled = true));
      const botaoCerto = alternativasEl.children[msg.respostaCorretaIndex];
      if (botaoCerto) botaoCerto.classList.add("correta-revelada");

      setTimeout(() => {
        mostrarTela(telaResultado);
        if (msg.seuResultado.respondeu) {
          resultadoTituloEl.textContent = msg.seuResultado.acertou ? "Você acertou!" : "Você errou";
        } else {
          resultadoTituloEl.textContent = "Tempo esgotado";
        }
        resultadoPontosEl.textContent = `+${msg.seuResultado.pontosGanhos} pontos`;
        renderizarMinhaPosicao(msg.placar, posicaoPerguntaEls);
        prepararTelaResultado(botaoProxima, statusProximoEl, msg.jaConfirmou);
      }, 1500);
      break;
    }

    case "iniciarLinking": {
      linkingTemaEl.textContent = msg.tema;
      linkingEsquerdaTextos = msg.esquerda;
      linkingDireitaTextos = msg.direita;
      // (ao voltar de uma queda, o servidor manda os pares que já estavam ligados)
      linkingCorretosSet = new Set(msg.corretos || []);
      linkingDireitaUsada = new Set(msg.direitaUsada || []);
      linkingTotalPares = msg.esquerda.length;
      linkingProgressoEl.textContent = `${linkingCorretosSet.size} de ${linkingTotalPares} pares`;
      renderizarListaEsquerda();
      if (msg.completou) {
        linkingListaEl.innerHTML = "";
        linkingTituloEl.textContent = "Tudo ligado! 🎉";
        linkingProgressoEl.textContent = `${linkingCorretosSet.size} de ${linkingTotalPares} pares — você terminou! Aguardando os outros...`;
      }
      iniciarContadorRedondo(intervaloLinking, anelLinkingEl, numeroLinkingEl, msg.tempoLimiteMs, (i) => (intervaloLinking = i));
      mostrarTela(telaLinking);
      break;
    }
    case "resultadoTentativaPar": {
      if (msg.correto) {
        linkingCorretosSet.add(msg.esquerdaIndex);
        linkingDireitaUsada.add(msg.direitaIndex);
        linkingProgressoEl.textContent = msg.completou
          ? `${linkingCorretosSet.size} de ${linkingTotalPares} pares — você terminou! Aguardando os outros...`
          : `${linkingCorretosSet.size} de ${linkingTotalPares} pares`;
        if (msg.completou) {
          linkingListaEl.innerHTML = "";
          linkingTituloEl.textContent = "Tudo ligado! 🎉";
        } else {
          renderizarListaEsquerda();
        }
      } else {
        const botaoErrado = linkingListaEl.querySelector(`[data-indice="${msg.direitaIndex}"]`);
        if (botaoErrado) {
          botaoErrado.disabled = false;
          botaoErrado.classList.add("incorreto");
          setTimeout(() => botaoErrado.classList.remove("incorreto"), 400);
        }
      }
      break;
    }
    case "resultadoLinking": {
      clearInterval(intervaloLinking);
      mostrarTela(telaResultadoLinking);
      linkingPontosEl.textContent = `+${msg.pontosGanhos} pontos (${msg.paresCorretos} de ${msg.totalPares} pares)`;
      linkingGabaritoEl.innerHTML = "";
      for (const par of msg.pares) {
        const li = document.createElement("li");
        li.textContent = `${par.esquerda} → ${par.direita}`;
        linkingGabaritoEl.appendChild(li);
      }
      renderizarMinhaPosicao(msg.placar, posicaoLinkingEls);
      prepararTelaResultado(botaoContinuarLinking, statusContinuarLinkingEl, msg.jaConfirmou);
      break;
    }

    case "iniciarSorting": {
      sortingCategoriaANome = msg.categoriaA;
      sortingCategoriaBNome = msg.categoriaB;
      sortingCategoriasEl.textContent = `${msg.categoriaA}  ou  ${msg.categoriaB}?`;
      sortingRespondidos = 0;
      sortingTotalItens = msg.itens.length;
      sortingLoteAtual = 0;
      sortingProgressoEl.textContent = `0 de ${sortingTotalItens} respondidos`;
      renderizarSorting(msg.itens, msg.categoriaA, msg.categoriaB);
      // (ao voltar de uma queda, o servidor manda os itens que já tinham sido classificados)
      for (const r of msg.respondidos || []) {
        const card = sortingItensEl.children[r.itemIndex];
        if (!card) continue;
        card.classList.add(r.correto ? "correto" : "incorreto");
        const botoes = card.querySelectorAll(".sorting-botao-categoria");
        botoes.forEach((b) => (b.disabled = true));
        botoes[r.categoria === "A" ? 0 : 1].classList.add("escolhida");
        sortingRespondidos++;
      }
      if (sortingRespondidos > 0) {
        sortingLoteAtual = Math.min(
          Math.floor(sortingRespondidos / ITENS_POR_LOTE_SORTING),
          Math.ceil(sortingTotalItens / ITENS_POR_LOTE_SORTING) - 1
        );
        mostrarLoteSorting();
        sortingProgressoEl.textContent = `${sortingRespondidos} de ${sortingTotalItens} respondidos`;
      }
      iniciarContadorRedondo(intervaloSorting, anelSortingEl, numeroSortingEl, msg.tempoLimiteMs, (i) => (intervaloSorting = i));
      mostrarTela(telaSorting);
      break;
    }
    case "resultadoClassificacaoItem": {
      const card = sortingItensEl.children[msg.itemIndex];
      card.classList.add(msg.correto ? "correto" : "incorreto");
      sortingRespondidos++;
      sortingProgressoEl.textContent = `${sortingRespondidos} de ${sortingTotalItens} respondidos`;

      // terminou o lote de 3 atual? revela o próximo lote (sem precisar rolar)
      if (sortingRespondidos < sortingTotalItens && sortingRespondidos % ITENS_POR_LOTE_SORTING === 0) {
        avancarLoteSorting();
      }
      break;
    }
    case "resultadoSorting": {
      clearInterval(intervaloSorting);
      if (msg.categoriaA) sortingCategoriaANome = msg.categoriaA;
      if (msg.categoriaB) sortingCategoriaBNome = msg.categoriaB;
      mostrarTela(telaResultadoSorting);
      sortingPontosEl.textContent = `+${msg.pontosGanhos} pontos (${msg.corretos} de ${msg.totalItens})`;
      sortingGabaritoEl.innerHTML = "";
      for (const item of msg.gabarito) {
        const li = document.createElement("li");
        const nomeCategoria = item.categoria === "A" ? sortingCategoriaANome : sortingCategoriaBNome;
        li.textContent = `${item.nome} — ${nomeCategoria}`;
        sortingGabaritoEl.appendChild(li);
      }
      renderizarMinhaPosicao(msg.placar, posicaoSortingEls);
      prepararTelaResultado(botaoContinuarSorting, statusContinuarSortingEl, msg.jaConfirmou);
      break;
    }

    case "iniciarPiramide": {
      piramideTotalDegraus = msg.totalDegraus;
      const eu = msg.jogadores.find((j) => j.id === meuJogadorId);
      piramideDegrauEl.textContent = `Degrau ${eu ? eu.posicao : 0} de ${piramideTotalDegraus}`;
      mostrarTela(telaPiramide);
      break;
    }
    case "novaPerguntaPiramide": {
      piramideJaRespondeu = false;
      piramideCategoriaEl.textContent = msg.categoria;
      piramidePerguntaEl.textContent = msg.pergunta;
      piramideAlternativasEl.innerHTML = "";
      msg.alternativas.forEach((alt, i) => {
        const btn = document.createElement("button");
        btn.className = "alternativa";
        btn.textContent = alt;
        btn.addEventListener("click", () => responderPiramide(i, btn));
        piramideAlternativasEl.appendChild(btn);
      });
      mostrarTela(telaPiramide);
      break;
    }
    case "respostaErradaPiramide": {
      piramideJaRespondeu = false;
      const botao = piramideAlternativasEl.children[msg.alternativaIndex];
      if (botao) {
        botao.classList.remove("selecionada");
        botao.classList.add("errada-piramide");
        botao.disabled = true;
      }
      break;
    }
    case "progressoPiramide": {
      const eu = msg.jogadores.find((j) => j.id === meuJogadorId);
      if (eu) piramideDegrauEl.textContent = `Degrau ${eu.posicao} de ${piramideTotalDegraus}`;
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
          li.append(criarEl("span", "", jogador.nome), criarEl("span", "", `degrau ${jogador.posicao}`));
          if (jogador.nome === msg.vencedorNome) li.classList.add("vencedor");
          piramidePosicoesFinaisEl.appendChild(li);
        });
      prepararTelaResultado(botaoContinuarPiramide, statusContinuarPiramideEl, msg.jaConfirmou);
      break;
    }

    case "progressoContinuar": {
      if (statusContinuarAtivoEl) {
        statusContinuarAtivoEl.classList.remove("oculto");
        statusContinuarAtivoEl.textContent = `${msg.confirmados} de ${msg.total} confirmaram estar prontos`;
      }
      break;
    }
    case "fimDePartida": {
      mostrarTela(telaFim);
      // só o anfitrião leva todo mundo de volta pro início pra jogar de novo
      botaoVoltarInicio.classList.toggle("oculto", !souAnfitriao);
      botaoVoltarInicio.disabled = false;
      fimTituloEl.textContent = msg.vencedorNome ? `🏆 ${msg.vencedorNome} venceu a partida!` : "Fim de partida!";
      renderizarMinhaPosicao(msg.placarFinal, posicaoFinalEls);
      break;
    }
    default:
      break;
  }
}

// Atualiza tudo que depende da lista de jogadores do lobby: a grade de
// animais (quais estão ocupados), a lista de quem entrou, a identidade
// própria e se o botão de iniciar já pode aparecer.
function atualizarLobby(jogadores) {
  jogadoresNaSala = jogadores;
  atualizarMeuAvatar(jogadores);
  renderizarAnimais();
  renderizarListaLobby();

  const eu = jogadores.find((j) => j.id === meuJogadorId);
  souAnfitriao = !!eu && eu.ehAnfitriao;
  const semAnimal = jogadores.filter((j) => !j.animalId).length;
  const pronto = semAnimal === 0 && jogadores.length >= 2;

  // o anfitrião sempre vê "Trocar animal" e "Iniciar" lado a lado; o Iniciar
  // fica apagado até todo mundo escolher o animal (o servidor também confere)
  botaoIniciar.classList.toggle("oculto", !souAnfitriao);
  botaoIniciar.disabled = !pronto;

  if (jogadores.length < 2) {
    aguardandoStatusEl.textContent = "Precisa de pelo menos 2 jogadores";
  } else if (semAnimal > 0) {
    aguardandoStatusEl.textContent =
      semAnimal === 1 ? "Aguardando 1 jogador escolher o animal..." : `Aguardando ${semAnimal} jogadores escolherem o animal...`;
  } else if (souAnfitriao) {
    aguardandoStatusEl.textContent = "Todos prontos! Inicie quando quiser";
  } else {
    aguardandoStatusEl.textContent = "Aguardando o anfitrião iniciar a partida...";
  }
}

function renderizarAnimais() {
  animaisGridEl.innerHTML = "";
  for (const animal of animaisDisponiveis) {
    const dono = jogadoresNaSala.find((j) => j.animalId === animal.id);
    const ehMeu = !!dono && dono.id === meuJogadorId;

    const btn = criarEl("button", "animal-btn");
    btn.style.setProperty("--cor-animal", animal.cor);
    btn.classList.toggle("meu", ehMeu);
    btn.append(
      criarEl("span", "animal-emoji", animal.emoji),
      criarEl("span", "animal-nome", animal.nome)
    );
    if (dono && !ehMeu) {
      btn.disabled = true;
      btn.appendChild(criarEl("span", "animal-dono", dono.nome));
    }
    btn.addEventListener("click", () => enviarAoServidor({ type: "escolherAnimal", animalId: animal.id }));
    animaisGridEl.appendChild(btn);
  }
}

function renderizarListaLobby() {
  listaJogadoresEl.innerHTML = "";
  for (const jogador of jogadoresNaSala) {
    const li = criarEl("li", jogador.animalId ? "" : "sem-animal");
    li.append(
      criarEl("span", "player-avatar", jogador.avatar ? jogador.avatar.emoji : "❔"),
      criarEl("span", "nome", jogador.nome + (jogador.ehAnfitriao ? " 👑" : ""))
    );
    listaJogadoresEl.appendChild(li);
  }
}

// guarda o próprio animal/cor (escolhidos no lobby) pra colorir a própria
// identidade, o destaque da resposta escolhida e os botões principais.
function atualizarMeuAvatar(jogadores) {
  const eu = jogadores.find((j) => j.id === meuJogadorId);
  if (!eu) return;
  meuNome = eu.nome;
  meuAvatar = eu.avatar || null;
  document.documentElement.style.setProperty("--cor-jogador", meuAvatar ? meuAvatar.cor : "#1e90ff");
  preencherIdentidades();
}

// Reinício manual escondido: 5 toques seguidos na pílula do jogador (ícone +
// nome) abrem o pop-up de confirmação. Só vale pro anfitrião, e os toques
// precisam ser seguidos - parou mais de 2s, a contagem recomeça.
const TOQUES_PARA_REINICIAR = 5;
const JANELA_ENTRE_TOQUES_MS = 2000;
let toquesNaIdentidade = 0;
let ultimoToqueIdentidade = 0;

function contarToqueNaIdentidade() {
  if (!souAnfitriao) return;
  const agora = Date.now();
  toquesNaIdentidade = agora - ultimoToqueIdentidade > JANELA_ENTRE_TOQUES_MS
    ? 1
    : toquesNaIdentidade + 1;
  ultimoToqueIdentidade = agora;
  if (toquesNaIdentidade >= TOQUES_PARA_REINICIAR) {
    toquesNaIdentidade = 0;
    modalReiniciarEl.classList.remove("oculto");
  }
}

function fecharModalReiniciar() {
  modalReiniciarEl.classList.add("oculto");
  toquesNaIdentidade = 0;
}

// a pílula "animal + nome" aparece no cabeçalho de todas as telas do jogo
function preencherIdentidades() {
  for (const el of document.querySelectorAll("[data-identidade]")) {
    el.innerHTML = "";
    if (!meuNome) continue;
    el.append(
      criarEl("span", "player-avatar", meuAvatar ? meuAvatar.emoji : "❔"),
      criarEl("span", "player-name", meuNome)
    );
  }
  // preencher recria o conteúdo; mantém o brilho de "já votei" se for o caso
  if (jaRespondeuEstaRodada) identidadePerguntaEl.classList.add("voted");
}

const CIRCUNFERENCIA_TIMER_MINI = 326.7;

function iniciarContadorRedondo(intervaloAntigo, anelEl, numeroEl, tempoLimiteMs, guardarIntervalo) {
  clearInterval(intervaloAntigo);
  const inicio = Date.now();
  let novoIntervalo = null;
  const atualizar = () => {
    const decorrido = Date.now() - inicio;
    const restanteMs = Math.max(0, tempoLimiteMs - decorrido);
    anelEl.style.strokeDashoffset = String(CIRCUNFERENCIA_TIMER_MINI * Math.min(1, decorrido / tempoLimiteMs));
    const restanteS = Math.ceil(restanteMs / 1000);
    numeroEl.textContent = String(restanteS);
    // últimos 3 segundos: o timer fica vermelho e pulsa (igual à TV)
    const modulo = anelEl.closest(".timer-redondo-mini");
    if (modulo) modulo.classList.toggle("urgente", restanteS <= 3 && restanteS > 0);
    if (restanteMs <= 0) clearInterval(novoIntervalo);
  };
  atualizar();
  novoIntervalo = setInterval(atualizar, 100);
  guardarIntervalo(novoIntervalo);
}

// Redige parte das letras do texto pra simular o efeito dos Mordicadores.
// Calculado uma única vez quando a janela de resposta abre (não fica
// piscando/trocando durante a resposta).
function aplicarMordida(texto, nivel) {
  if (nivel <= 0) return texto;
  const fracao = Math.min(0.7, nivel * 0.2);
  return texto
    .split("")
    .map((ch) => (/[a-zA-ZÀ-ÿ]/.test(ch) && Math.random() < fracao ? "▒" : ch))
    .join("");
}

function renderizarAlternativas(alternativas, nivelMordida) {
  alternativasEl.innerHTML = "";
  alternativas.forEach((alt, i) => {
    const btn = document.createElement("button");
    btn.className = "alternativa";
    btn.textContent = aplicarMordida(alt, nivelMordida);
    btn.disabled = true; // só libera de vez quando a leitura acabar (e a obstrução, se houver, for limpa)
    btn.addEventListener("click", () => responder(i, btn));
    alternativasEl.appendChild(btn);
  });
}

function escolherTipoPoder(tipo, botaoClicado) {
  if (jaEscolheuTipoPoder) return;
  jaEscolheuTipoPoder = true;

  document.querySelectorAll("#poder-tipos .alternativa").forEach((b) => (b.disabled = true));
  botaoClicado.classList.add("selecionada");

  enviarAoServidor({ type: "escolherPoder", tipo });
}

function escolherAlvo(alvoId, botaoClicado) {
  if (jaEscolheuAlvo) return;
  jaEscolheuAlvo = true;

  document.querySelectorAll("#alvo-lista button").forEach((b) => (b.disabled = true));
  botaoClicado.classList.add("selecionada");
  alvoUsadoMsgEl.textContent = "Poder usado!";
  alvoUsadoMsgEl.classList.remove("oculto");

  enviarAoServidor({ type: "escolherAlvoPoder", alvoId });
}

// Monta a camada de obstrução (gelo/gosma pedindo toques + bolhas pra
// estourar) por cima das alternativas, e só libera os botões de resposta
// de verdade quando tudo tiver sido limpo.
function montarObstrucao(efeitos) {
  const hitsGeloGosma = efeitos.filter((e) => e.tipo === "congelamento" || e.tipo === "gosma").length;
  const hitsBombolha = efeitos.filter((e) => e.tipo === "bombolha").length;

  if (hitsGeloGosma === 0 && hitsBombolha === 0) {
    obstrucaoEl.classList.add("oculto");
    liberarRespostaDeVerdade();
    return;
  }

  let toquesRestantes = hitsGeloGosma * 3;
  let bolhasRestantes = hitsBombolha * 2;

  obstrucaoEl.innerHTML = "";
  obstrucaoEl.classList.remove("oculto");

  const iconesAtivos = [...new Set(efeitos.map((e) => (POR_TIPO[e.tipo] || {}).icone).filter(Boolean))].join(" ");
  const mensagemEl = document.createElement("p");
  mensagemEl.className = "obstrucao-mensagem";
  mensagemEl.textContent = `${iconesAtivos} Alguém tentou te atrapalhar!`;
  obstrucaoEl.appendChild(mensagemEl);

  let botaoToque = null;
  if (toquesRestantes > 0) {
    botaoToque = document.createElement("button");
    botaoToque.className = "obstrucao-toque";
    const atualizarTexto = () => (botaoToque.textContent = `Toque pra se livrar! (${toquesRestantes})`);
    atualizarTexto();
    botaoToque.addEventListener("click", () => {
      toquesRestantes--;
      if (toquesRestantes <= 0) {
        botaoToque.remove();
        verificarLimpeza();
      } else {
        atualizarTexto();
      }
    });
    obstrucaoEl.appendChild(botaoToque);
  }

  let areaBolhas = null;
  if (bolhasRestantes > 0) {
    areaBolhas = document.createElement("div");
    areaBolhas.className = "bolhas-area";
    for (let i = 0; i < bolhasRestantes; i++) {
      const bolha = document.createElement("button");
      bolha.className = "bolha";
      bolha.textContent = "💧";
      bolha.style.left = `${Math.random() * 80}%`;
      bolha.style.top = `${Math.random() * 70}%`;
      bolha.addEventListener("click", () => {
        bolha.remove();
        bolhasRestantes--;
        if (bolhasRestantes <= 0) verificarLimpeza();
      });
      areaBolhas.appendChild(bolha);
    }
    obstrucaoEl.appendChild(areaBolhas);
  }

  function verificarLimpeza() {
    if (toquesRestantes <= 0 && bolhasRestantes <= 0) {
      obstrucaoEl.classList.add("oculto");
      liberarRespostaDeVerdade();
    }
  }
}

function liberarRespostaDeVerdade() {
  document.querySelectorAll("#alternativas .alternativa").forEach((b) => (b.disabled = false));
}

function escolherPorta(indice, botaoClicado) {
  if (jaEscolheuPorta) return;
  jaEscolheuPorta = true;

  document.querySelectorAll("#portas .alternativa").forEach((b) => (b.disabled = true));
  botaoClicado.classList.add("selecionada");
  const garantir = checkboxGarantirPortaEl.checked;
  checkboxGarantirPortaEl.disabled = true;

  enviarAoServidor({ type: "escolherPorta", indice, garantir });
  mostrarTela(telaAguardandoPorta);
}

function responder(indice, botaoClicado) {
  if (jaRespondeuEstaRodada) return;
  jaRespondeuEstaRodada = true;

  document.querySelectorAll("#alternativas .alternativa").forEach((b) => (b.disabled = true));
  botaoClicado.classList.add("selecionada");
  identidadePerguntaEl.classList.add("voted"); // a pílula do jogador também acende

  enviarAoServidor({ type: "responder", alternativaIndex: indice });
  // fica na própria tela-pergunta (grid desabilitado, sua escolha em
  // destaque) em vez de trocar de tela - é nela que a resposta certa vai
  // piscar em verde quando a TV revelar.
}

// Mostra a lista de itens da esquerda, um por linha, em tela cheia. Tocar
// num item ainda não ligado leva pra lista de opções da direita.
function renderizarListaEsquerda() {
  linkingTituloEl.textContent = "Toque em um item pra ligar";
  linkingListaEl.innerHTML = "";
  linkingEsquerdaTextos.forEach((texto, i) => {
    const btn = document.createElement("button");
    btn.className = "linking-item-full";
    if (linkingCorretosSet.has(i)) {
      btn.textContent = `✅ ${texto}`;
      btn.classList.add("correto");
      btn.disabled = true;
    } else {
      btn.textContent = texto;
      btn.addEventListener("click", () => mostrarOpcoesDireita(i));
    }
    linkingListaEl.appendChild(btn);
  });
}

// Mostra as opções da direita em tela cheia, pra ligar com o item da
// esquerda escolhido. Um botão "Voltar" permite desistir e trocar de item.
function mostrarOpcoesDireita(esquerdaIndex) {
  linkingTituloEl.textContent = `Ligue "${linkingEsquerdaTextos[esquerdaIndex]}" com:`;
  linkingListaEl.innerHTML = "";
  linkingDireitaTextos.forEach((texto, k) => {
    const btn = document.createElement("button");
    btn.className = "linking-item-full";
    btn.textContent = texto;
    btn.dataset.indice = k;
    if (linkingDireitaUsada.has(k)) {
      btn.disabled = true;
      btn.classList.add("usado");
    } else {
      btn.addEventListener("click", () => tentarPar(esquerdaIndex, k, btn));
    }
    linkingListaEl.appendChild(btn);
  });

  const botaoVoltar = document.createElement("button");
  botaoVoltar.className = "linking-voltar";
  botaoVoltar.textContent = "← Voltar";
  botaoVoltar.addEventListener("click", renderizarListaEsquerda);
  linkingListaEl.appendChild(botaoVoltar);
}

function tentarPar(esquerdaIndex, direitaIndex, botaoClicado) {
  botaoClicado.disabled = true; // trava até a resposta do servidor chegar, evita clique duplo
  enviarAoServidor({ type: "tentarPar", esquerdaIndex, direitaIndex });
}

function renderizarSorting(itens, categoriaA, categoriaB) {
  sortingItensEl.innerHTML = "";
  itens.forEach((nome, i) => {
    const card = document.createElement("div");
    card.className = "sorting-item";
    // só o primeiro lote de 3 itens começa visível - os outros ficam
    // escondidos no DOM (mantendo o índice certo pra quando o resultado
    // de cada item chegar) até o jogador terminar o lote atual.
    if (Math.floor(i / ITENS_POR_LOTE_SORTING) !== 0) card.classList.add("oculto");

    const nomeEl = document.createElement("p");
    nomeEl.className = "sorting-item-nome";
    nomeEl.textContent = nome;

    const botoes = document.createElement("div");
    botoes.className = "sorting-item-botoes";

    const btnA = document.createElement("button");
    btnA.className = "sorting-botao-categoria";
    btnA.textContent = categoriaA;

    const btnB = document.createElement("button");
    btnB.className = "sorting-botao-categoria";
    btnB.textContent = categoriaB;

    btnA.addEventListener("click", () => classificar(i, "A", btnA, btnB));
    btnB.addEventListener("click", () => classificar(i, "B", btnB, btnA));

    botoes.appendChild(btnA);
    botoes.appendChild(btnB);
    card.appendChild(nomeEl);
    card.appendChild(botoes);
    sortingItensEl.appendChild(card);
  });
}

function avancarLoteSorting() {
  sortingLoteAtual++;
  mostrarLoteSorting();
}

function mostrarLoteSorting() {
  const inicio = sortingLoteAtual * ITENS_POR_LOTE_SORTING;
  const fim = inicio + ITENS_POR_LOTE_SORTING;
  [...sortingItensEl.children].forEach((card, i) => {
    card.classList.toggle("oculto", i < inicio || i >= fim);
  });
}

function classificar(itemIndex, categoria, botaoEscolhido, botaoOutro) {
  if (botaoEscolhido.disabled || botaoOutro.disabled) return;
  botaoEscolhido.disabled = true;
  botaoOutro.disabled = true;
  botaoEscolhido.classList.add("escolhida");
  enviarAoServidor({ type: "classificarItem", itemIndex, categoria });
}

function responderPiramide(indice, botaoClicado) {
  if (piramideJaRespondeu || botaoClicado.disabled) return;
  piramideJaRespondeu = true;
  botaoClicado.classList.add("selecionada");
  enviarAoServidor({ type: "responderPiramide", alternativaIndex: indice });
}

botaoEntrar.addEventListener("click", () => {
  if (!campoNome.value.trim()) {
    mensagemErroEl.textContent = "Digite seu nome.";
    return;
  }
  if (campoCodigo.value.trim().length !== 4) {
    mensagemErroEl.textContent = "O código tem 4 letras.";
    return;
  }
  mensagemErroEl.textContent = "";
  conectar();
});

// o ouvinte fica no contêiner da pílula, que não é recriado quando o nome e o
// animal são redesenhados
for (const el of document.querySelectorAll("[data-identidade]")) {
  el.addEventListener("click", contarToqueNaIdentidade);
}
botaoCancelarReiniciarEl.addEventListener("click", fecharModalReiniciar);
botaoConfirmarReiniciarEl.addEventListener("click", () => {
  fecharModalReiniciar();
  enviarAoServidor({ type: "reiniciarPartida" });
});

botaoVoltarInicio.addEventListener("click", () => {
  botaoVoltarInicio.disabled = true;
  enviarAoServidor({ type: "voltarAoLobby" });
});

botaoTrocarAnimal.addEventListener("click", () => {
  enviarAoServidor({ type: "liberarAnimal" }); // o animal atual já fica livre pros outros
  mostrarTela(telaAnimal);
});
fecharAvisoGirarEl.addEventListener("click", () => avisoGirarEl.classList.add("dispensado"));

botaoIniciar.addEventListener("click", () => {
  enviarAoServidor({ type: "iniciarPartida" });
});

botaoProxima.addEventListener("click", () => confirmarContinuar(botaoProxima));
botaoContinuarLinking.addEventListener("click", () => confirmarContinuar(botaoContinuarLinking));
botaoContinuarSorting.addEventListener("click", () => confirmarContinuar(botaoContinuarSorting));
botaoContinuarPiramide.addEventListener("click", () => confirmarContinuar(botaoContinuarPiramide));

// Se esta aba já tinha uma partida em andamento (recarregou a página, o
// navegador descartou a aba em segundo plano...), tenta voltar pra ela.
(function reconectarAoCarregar() {
  const sessao = lerSessao();
  if (!sessao) return;
  const codigoDaUrlAgora = (new URLSearchParams(location.search).get("codigo") || "").toUpperCase();
  if (codigoDaUrlAgora && codigoDaUrlAgora !== sessao.codigoSala) {
    limparSessao(); // abriu o link de OUTRA sala: é uma entrada nova
    return;
  }
  campoCodigo.value = sessao.codigoSala;
  tentandoReconectar = true;
  desistirReconexaoEm = Date.now() + DESISTIR_RECONEXAO_MS;
  mostrarAvisoConexao("📡 Reconectando à sua partida…");
  conectar("reconectar");
})();

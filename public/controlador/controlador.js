// cada tela de resultado tem seu próprio bloco "Sua posição" (mesmos campos,
// ids com sufixo diferente)
function elementosDePosicao(sufixo) {
  return {
    numero: document.getElementById(`posicao-numero${sufixo}`),
    pontos: document.getElementById(`posicao-pontos${sufixo}`),
    diferenca: document.getElementById(`posicao-diferenca${sufixo}`),
  };
}

const telaEntrada = document.getElementById("tela-entrada");
const telaAnimal = document.getElementById("tela-animal");
const telaAguardando = document.getElementById("tela-aguardando");
const telaEscolhaPorta = document.getElementById("tela-escolha-porta");
const telaAguardandoPorta = document.getElementById("tela-aguardando-porta");
const telaEscolhaPoder = document.getElementById("tela-escolha-poder");
const telaEscolhaAlvo = document.getElementById("tela-escolha-alvo");
const telaOlheTv = document.getElementById("tela-olhe-tv");
const telaPergunta = document.getElementById("tela-pergunta");
const telaResultado = document.getElementById("tela-resultado");
const telaLinking = document.getElementById("tela-linking");
const telaResultadoLinking = document.getElementById("tela-resultado-linking");
const telaSorting = document.getElementById("tela-sorting");
const telaResultadoSorting = document.getElementById("tela-resultado-sorting");
const telaPiramide = document.getElementById("tela-piramide");
const telaFim = document.getElementById("tela-fim");

const TODAS_AS_TELAS = [
  telaEntrada, telaAnimal, telaAguardando, telaEscolhaPorta, telaAguardandoPorta,
  telaEscolhaPoder, telaEscolhaAlvo, telaOlheTv,
  telaPergunta, telaResultado,
  telaLinking, telaResultadoLinking, telaSorting, telaResultadoSorting,
  telaPiramide,
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
const bonusNevoaEl = document.getElementById("bonus-nevoa");

const anelPoderEl = document.getElementById("anel-poder");
const numeroPoderEl = document.getElementById("numero-poder");
const anelAlvoEl = document.getElementById("anel-alvo");
const numeroAlvoEl = document.getElementById("numero-alvo");
const olheTvDetalheEl = document.getElementById("olhe-tv-detalhe");

const avisoConexaoEl = document.getElementById("aviso-conexao");
const modalReiniciarEl = document.getElementById("modal-reiniciar");
const botaoConfirmarReiniciarEl = document.getElementById("botao-confirmar-reiniciar");
const botaoCancelarReiniciarEl = document.getElementById("botao-cancelar-reiniciar");

const resultadoTituloEl = document.getElementById("resultado-titulo");
const resultadoPontosEl = document.getElementById("resultado-pontos");
const resultadoExtrasEl = document.getElementById("resultado-extras");
const posicaoPerguntaEls = elementosDePosicao("");
const botaoProxima = document.getElementById("botao-proxima");
const statusProximoEl = document.getElementById("status-proximo");

const linkingTemaEl = document.getElementById("linking-tema");
const linkingTituloEl = document.getElementById("linking-titulo");
const anelLinkingEl = document.getElementById("anel-linking");
const numeroLinkingEl = document.getElementById("numero-linking");
const linkingListaEl = document.getElementById("linking-lista");
const linkingProgressoEl = document.getElementById("linking-progresso");
const linkingResultadoTituloEl = document.getElementById("linking-resultado-titulo");
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
const sortingResultadoTituloEl = document.getElementById("sorting-resultado-titulo");
const sortingPontosEl = document.getElementById("sorting-pontos");
const sortingGabaritoEl = document.getElementById("sorting-gabarito");
const posicaoSortingEls = elementosDePosicao("-sorting");
const botaoContinuarSorting = document.getElementById("botao-continuar-sorting");
const statusContinuarSortingEl = document.getElementById("status-continuar-sorting");

const piramideAndarEl = document.getElementById("piramide-andar");
const piramideCategoriaEl = document.getElementById("piramide-categoria");
const piramidePerguntaEl = document.getElementById("piramide-pergunta");
const piramideAlternativasEl = document.getElementById("piramide-alternativas");

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
let intervaloLeitura = null;
let intervaloPergunta = null;
let intervaloPorta = null;
let intervaloPoder = null;
let intervaloAlvo = null;
let alternativasBrutas = [];
let efeitosAtivosAtuais = [];
let escudoDaPergunta = null; // { bloqueados } quando o jogador usou Escudo nesta pergunta

// confirmação genérica de "continuar" (usada depois de pergunta, Linking e Sorting)
let jaConfirmouContinuar = false;
let statusContinuarAtivoEl = null;

// estado do Linking
let linkingEsquerdaTextos = [];
let linkingDireitaTextos = [];
let linkingCorretosSet = new Set();
let linkingDireitaUsada = new Set();
let linkingParesFeitos = new Map(); // esquerdaIndex -> texto da direita que ele ligou
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
let piramideTotalAndares = 0;
let piramideJaRespondeu = false;

// zera todos os contadores de tempo que possam estar rodando
function pararContadores() {
  for (const i of [intervaloLeitura, intervaloPergunta, intervaloPorta, intervaloPoder,
                   intervaloAlvo, intervaloLinking, intervaloSorting]) {
    clearInterval(i);
  }
}

function mostrarTela(tela) {
  telaAtual = tela;
  for (const t of TODAS_AS_TELAS) t.classList.toggle("oculto", t !== tela);
}

// "Tema 2 de 5 — Pergunta 3 de 3"
function rotuloDaPergunta(msg) {
  return `Tema ${msg.rodadaAtual} de ${msg.totalRodadas} — Pergunta ${msg.perguntaNaRodada} de ${msg.totalPerguntasPorRodada}`;
}

// enquanto a TV mostra algo que é para todo mundo ver junto
function mostrarOlheTv(detalhe = "") {
  olheTvDetalheEl.textContent = detalhe;
  mostrarTela(telaOlheTv);
}

// 0 é o chão; o topo é o último andar
function textoDoAndar(n) {
  return n <= 0 ? `No chão · topo no andar ${piramideTotalAndares}` : `Andar ${n} de ${piramideTotalAndares}`;
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
      EfeitosPergunta.parar();
      CelularFim.parar();
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
      rodadaRotuloEl.textContent = `Tema ${msg.rodadaAtual} de ${msg.totalRodadas}`;
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
      aguardandoPortaTituloEl.textContent = "Tema escolhido";
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
      // 3 de ataque + 1 especial sorteado pelo servidor, e "Não usar poder"
      mostrarTela(telaEscolhaPoder);
      CelularPoderes.montarEscolha(msg, rotuloDaPergunta(msg), (tipo) =>
        enviarAoServidor({ type: "escolherPoder", tipo })
      );
      iniciarContadorRedondo(intervaloPoder, anelPoderEl, numeroPoderEl, msg.tempoLimiteMs, (i) => (intervaloPoder = i));
      break;
    }
    case "escolhaAlvo": {
      clearInterval(intervaloPoder);
      mostrarTela(telaEscolhaAlvo);
      CelularPoderes.montarAlvo(msg, (alvoId) => enviarAoServidor({ type: "escolherAlvoPoder", alvoId }));
      iniciarContadorRedondo(intervaloAlvo, anelAlvoEl, numeroAlvoEl, msg.tempoLimiteMs, (i) => (intervaloAlvo = i),
        CelularPoderes.tempoEsgotadoAlvo);
      break;
    }
    case "olheParaTv": {
      // a TV está mostrando quem atacou quem; a pergunta vem logo depois
      clearInterval(intervaloPoder);
      clearInterval(intervaloAlvo);
      mostrarOlheTv();
      break;
    }
    case "novaPergunta": {
      jaRespondeuEstaRodada = false;
      identidadePerguntaEl.classList.remove("voted");
      efeitosAtivosAtuais = [];
      escudoDaPergunta = null;
      EfeitosPergunta.parar();
      alternativasBrutas = msg.alternativas;

      // o timer da resposta só começa a contar quando a leitura acabar
      clearInterval(intervaloPergunta);
      anelPerguntaEl.style.strokeDashoffset = "0";
      numeroPerguntaEl.textContent = "";
      anelPerguntaEl.closest(".timer-redondo-mini").classList.remove("urgente");

      clearInterval(intervaloPoder);
      clearInterval(intervaloAlvo);
      mostrarTela(telaPergunta);
      progressoRodadaEl.textContent = rotuloDaPergunta(msg);
      perguntaCategoriaEl.textContent = msg.categoria;
      perguntaTextoEl.textContent = msg.pergunta;

      // as alternativas só aparecem quando o tempo de leitura acabar
      // (em "iniciarResposta"); até lá, ficam escondidas de propósito.
      areaAlternativasEl.classList.add("oculto");
      alternativasEl.innerHTML = "";

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
    case "iniciarResposta": {
      clearInterval(intervaloLeitura);
      faseLeituraEl.classList.add("oculto");
      efeitosAtivosAtuais = msg.efeitosAtivos || [];
      escudoDaPergunta = msg.escudo || null;

      const mordidas = efeitosAtivosAtuais.filter((e) => e.tipo === "mordicadores").length;
      renderizarAlternativas(alternativasBrutas, mordidas);
      areaAlternativasEl.classList.remove("oculto");

      if (msg.respostaDada !== null && msg.respostaDada !== undefined) {
        // voltou de uma queda depois de já ter respondido: mostra a escolha dele travada
        jaRespondeuEstaRodada = true;
        const escolhido = alternativasEl.children[msg.respostaDada];
        if (escolhido) escolhido.classList.add("selecionada");
        identidadePerguntaEl.classList.add("voted");
      } else {
        // gelo e névoa entram por cima das alternativas; os botões já ficam
        // liberados (o toque no gelo derrete em vez de responder)
        EfeitosPergunta.montar({
          botoes: [...alternativasEl.children],
          efeitos: efeitosAtivosAtuais,
          tempoLimiteMs: msg.tempoLimiteMs,
          tempoTotalMs: msg.tempoTotalMs,
          bonusMax: msg.bonusVelocidadeMax,
          bonusEl: bonusNevoaEl,
        });
        liberarRespostaDeVerdade();
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
      EfeitosPergunta.revelar(); // sem gelo nem névoa na frente da resposta certa
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
        renderizarExtrasDoResultado(msg);
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
      linkingParesFeitos = new Map();
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
        linkingParesFeitos.set(msg.esquerdaIndex, linkingDireitaTextos[msg.direitaIndex]);
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
      linkingResultadoTituloEl.textContent = msg.paresCorretos >= msg.totalPares
        ? "Você ligou tudo! 🎉"
        : `Você ligou ${msg.paresCorretos} de ${msg.totalPares}`;
      linkingPontosEl.textContent = `+${msg.pontosGanhos} pontos`;
      // o servidor diz quais pares ele ligou (vale mesmo se reconectou agora)
      const ligados = new Set(msg.corretos || linkingCorretosSet);
      linkingGabaritoEl.replaceChildren(
        ...msg.pares.map((par, i) => {
          const acertou = ligados.has(i);
          const li = criarEl("li", acertou ? "acertou" : "");
          li.style.animationDelay = `${i * 60}ms`;
          li.append(
            criarEl("span", "selo-gabarito", acertou ? "✓" : "–"),
            criarEl("span", "esquerda", par.esquerda),
            document.createTextNode("→"),
            criarEl("span", "direita", par.direita)
          );
          return li;
        })
      );
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
      sortingResultadoTituloEl.textContent = msg.corretos >= msg.totalItens
        ? "Você acertou todos! 🎉"
        : `Você acertou ${msg.corretos} de ${msg.totalItens}`;
      sortingPontosEl.textContent = `+${msg.pontosGanhos} pontos`;
      renderizarGabaritoClassificacao(msg);
      renderizarMinhaPosicao(msg.placar, posicaoSortingEls);
      prepararTelaResultado(botaoContinuarSorting, statusContinuarSortingEl, msg.jaConfirmou);
      break;
    }

    case "largadaPiramide": {
      // a TV mostra a pontuação de cada um virando o andar de largada
      pararContadores();
      piramideTotalAndares = msg.totalAndares;
      const eu = msg.jogadores.find((j) => j.id === meuJogadorId);
      mostrarOlheTv(eu ? `Você larga ${eu.largada === 0 ? "do chão" : `no andar ${eu.largada}`}` : "");
      break;
    }
    case "iniciarPiramide": {
      piramideTotalAndares = msg.totalAndares;
      const eu = msg.jogadores.find((j) => j.id === meuJogadorId);
      piramideAndarEl.textContent = textoDoAndar(eu ? eu.posicao : 0);
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
      if (eu) piramideAndarEl.textContent = textoDoAndar(eu.posicao);
      break;
    }
    case "vencedorPiramide": {
      // alguém chegou ao topo: a TV comemora e o pódio vem sozinho em seguida
      piramideAlternativasEl.querySelectorAll(".alternativa").forEach((b) => (b.disabled = true));
      const venci = msg.vencedorId === meuJogadorId;
      mostrarOlheTv(venci ? "🏆 Você chegou ao topo!" : `🏆 ${msg.vencedorNome} chegou ao topo!`);
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
      // na TV só o pódio; aqui, quem venceu, a sua colocação e o placar das rodadas
      pararContadores();
      mostrarTela(telaFim);
      CelularFim.montar(msg, {
        meuId: meuJogadorId,
        souAnfitriao, // só o anfitrião leva todo mundo de volta pro início
        aoJogarDeNovo: () => enviarAoServidor({ type: "voltarAoLobby" }),
      });
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

// aoAcabar: chamado uma vez quando o tempo zera (opcional)
function iniciarContadorRedondo(intervaloAntigo, anelEl, numeroEl, tempoLimiteMs, guardarIntervalo, aoAcabar) {
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
    if (restanteMs <= 0) {
      clearInterval(novoIntervalo);
      if (aoAcabar) aoAcabar();
    }
  };
  atualizar();
  novoIntervalo = setInterval(atualizar, 100);
  guardarIntervalo(novoIntervalo);
}

// O texto fica num <span> próprio: é nele que a Névoa borra, e o gelo entra
// por cima do botão inteiro. Os Mordicadores comem as letras uma vez só,
// aqui, quando a janela de resposta abre (não fica trocando durante a resposta).
function renderizarAlternativas(alternativas, mordidas) {
  alternativasEl.innerHTML = "";
  alternativas.forEach((alt, i) => {
    const btn = document.createElement("button");
    btn.className = "alternativa";
    btn.append(criarEl("span", "texto-alternativa", EfeitosPergunta.morder(alt, mordidas)));
    btn.disabled = true; // só libera quando a leitura acabar
    btn.addEventListener("click", (evento) => tocarAlternativa(i, btn, evento));
    alternativasEl.appendChild(btn);
  });
}

function liberarRespostaDeVerdade() {
  document.querySelectorAll("#alternativas .alternativa").forEach((b) => (b.disabled = false));
}

// com gelo, o toque derrete; sem gelo (ou já derretido), responde
function tocarAlternativa(indice, btn, evento) {
  if (jaRespondeuEstaRodada) return;
  if (EfeitosPergunta.tocarGelo(btn, evento)) return;
  responder(indice, btn);
}

// Festa de Pontos, Aposta e Escudo da pergunta, abaixo da posição
function renderizarExtrasDoResultado(msg) {
  resultadoExtrasEl.replaceChildren();
  const r = msg.seuResultado;
  if (msg.festaAtiva) {
    resultadoExtrasEl.append(criarEl("p", "resultado-extra festa",
      r.acertou ? "🎉 Festa de Pontos: seu acerto valeu o dobro!" : "🎉 Festa de Pontos: o acerto valia o dobro"));
  }
  if (r.aposta) {
    const alvo = r.aposta.alvoNome || "Seu alvo";
    resultadoExtrasEl.append(criarEl("p", "resultado-extra aposta" + (r.aposta.ganhou ? " ganhou" : ""),
      r.aposta.ganhou ? `🎲 ${alvo} acertou: sua aposta rendeu +${r.aposta.premio}` : `🎲 ${alvo} errou: a aposta não rendeu nada`));
  }
  if (escudoDaPergunta) {
    const n = escudoDaPergunta.bloqueados;
    resultadoExtrasEl.append(criarEl("p", "resultado-extra escudo",
      n > 0 ? `🛡️ Seu escudo segurou ${n === 1 ? "1 ataque" : `${n} ataques`}` : "🛡️ Seu escudo ficou de guarda: ninguém atacou"));
  }
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
  EfeitosPergunta.travarResposta(botaoClicado); // o bônus da Névoa para no valor do toque

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
      // o par inteiro, pra ele ver o que já ligou (ao reconectar, só o item)
      const direita = linkingParesFeitos.get(i);
      btn.textContent = direita ? `✓ ${texto} → ${direita}` : `✓ ${texto}`;
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

// O gabarito da Classificação dividido nos dois lados, e em cada item o que
// ESTE jogador fez: ✓ pôs do lado certo, ✗ pôs do outro lado, – não respondeu.
// O item aparece sempre no lado certo; a marca é que diz como ele foi.
function renderizarGabaritoClassificacao(msg) {
  const minhas = new Map((msg.minhasRespostas || []).map((r) => [r.nome, r]));
  const grupos = [["A", msg.categoriaA], ["B", msg.categoriaB]].map(([chave, nome]) => {
    const grupo = criarEl("div", `gabarito-grupo ${chave.toLowerCase()}`);
    const lista = criarEl("ul");
    for (const item of msg.gabarito.filter((x) => x.categoria === chave)) {
      const minha = minhas.get(item.nome);
      const estado = !minha || minha.escolhida === null ? "pulou" : minha.correto ? "acertou" : "errou";
      const li = criarEl("li", estado);
      li.append(
        criarEl("span", "selo-gabarito", estado === "acertou" ? "✓" : estado === "errou" ? "✗" : "–"),
        document.createTextNode(item.nome)
      );
      lista.append(li);
    }
    grupo.append(criarEl("h4", "", nome), lista);
    return grupo;
  });
  sortingGabaritoEl.replaceChildren(...grupos);
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

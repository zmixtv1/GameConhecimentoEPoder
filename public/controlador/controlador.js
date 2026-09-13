const POR_TIPO = {
  congelamento: { icone: "🧊", nome: "Congelamento" },
  gosma: { icone: "🟢", nome: "Gosma" },
  bombolha: { icone: "🫧", nome: "Bombolha" },
  mordicadores: { icone: "😬", nome: "Mordicadores" },
};

const telaEntrada = document.getElementById("tela-entrada");
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
  telaEntrada, telaAguardando, telaEscolhaPorta, telaAguardandoPorta,
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

const listaJogadoresEl = document.getElementById("lista-jogadores");
const botaoIniciar = document.getElementById("botao-iniciar");

const playerIdentityAvatarEl = document.getElementById("player-identity-avatar");
const playerIdentityNomeEl = document.getElementById("player-identity-nome");
const rodadaRotuloEl = document.getElementById("rodada-rotulo");
const anelPortaEl = document.getElementById("anel-porta");
const numeroPortaEl = document.getElementById("numero-porta");
const opcaoGarantirPortaEl = document.getElementById("opcao-garantir-porta");
const checkboxGarantirPortaEl = document.getElementById("checkbox-garantir-porta");
const poderPortaUsadoMsgEl = document.getElementById("poder-porta-usado-msg");
const portasEl = document.getElementById("portas");

const progressoRodadaEl = document.getElementById("progresso-rodada");
const perguntaCategoriaEl = document.getElementById("pergunta-categoria");
const perguntaTextoEl = document.getElementById("pergunta-texto");
const areaAlternativasEl = document.getElementById("area-alternativas");
const alternativasEl = document.getElementById("alternativas");
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
const obstrucaoEl = document.getElementById("obstrucao");

const resultadoTituloEl = document.getElementById("resultado-titulo");
const resultadoPontosEl = document.getElementById("resultado-pontos");
const placarEl = document.getElementById("placar");
const placarFinalEl = document.getElementById("placar-final");
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
const placarLinkingEl = document.getElementById("placar-linking");
const botaoContinuarLinking = document.getElementById("botao-continuar-linking");
const statusContinuarLinkingEl = document.getElementById("status-continuar-linking");

const anelSortingEl = document.getElementById("anel-sorting");
const numeroSortingEl = document.getElementById("numero-sorting");
const sortingCategoriasEl = document.getElementById("sorting-categorias");
const sortingItensEl = document.getElementById("sorting-itens");
const sortingProgressoEl = document.getElementById("sorting-progresso");
const sortingPontosEl = document.getElementById("sorting-pontos");
const sortingGabaritoEl = document.getElementById("sorting-gabarito");
const placarSortingEl = document.getElementById("placar-sorting");
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
let jaRespondeuEstaRodada = false;
let jaEscolheuPorta = false;
let jaEscolheuTipoPoder = false;
let jaEscolheuAlvo = false;
let intervaloLeitura = null;
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

function mostrarTela(tela) {
  for (const t of TODAS_AS_TELAS) t.classList.toggle("oculto", t !== tela);
}

function renderizarPlacar(lista, ol) {
  ol.innerHTML = "";
  for (const jogador of lista) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${jogador.nome}</span><span>${jogador.pontos} pts</span>`;
    ol.appendChild(li);
  }
}

function prepararTelaResultado(botao, statusEl) {
  jaConfirmouContinuar = false;
  botao.disabled = false;
  statusEl.classList.add("oculto");
  statusEl.textContent = "";
  statusContinuarAtivoEl = statusEl;
}

function confirmarContinuar(botao) {
  if (jaConfirmouContinuar) return;
  jaConfirmouContinuar = true;
  botao.disabled = true;
  statusContinuarAtivoEl.classList.remove("oculto");
  statusContinuarAtivoEl.textContent = "Aguardando os outros jogadores...";
  ws.send(JSON.stringify({ type: "continuar" }));
}

function conectar() {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocolo}//${location.host}`);

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({
      type: "entrar",
      nome: campoNome.value.trim(),
      codigoSala: campoCodigo.value.trim(),
    }));
  });

  ws.addEventListener("message", (evento) => {
    tratarMensagem(JSON.parse(evento.data));
  });

  ws.addEventListener("close", () => {
    mensagemErroEl.textContent = "Conexão perdida. Recarregue a página.";
  });
}

function tratarMensagem(msg) {
  switch (msg.type) {
    case "erroEntrada": {
      mensagemErroEl.textContent = msg.mensagem;
      if (ws) ws.close();
      break;
    }
    case "erroAcao": {
      alert(msg.mensagem);
      break;
    }
    case "entrouComSucesso": {
      meuJogadorId = msg.jogadorId;
      mostrarTela(telaAguardando);
      botaoIniciar.classList.toggle("oculto", !msg.ehAnfitriao);
      renderizarListaSimples(msg.jogadores);
      atualizarMeuAvatar(msg.jogadores);
      break;
    }
    case "jogadoresAtualizados": {
      renderizarListaSimples(msg.jogadores);
      atualizarMeuAvatar(msg.jogadores);
      break;
    }
    case "escolhaPorta": {
      jaEscolheuPorta = false;
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
      break;
    }
    case "portaEscolhida": {
      // a escolha de poder chega logo em seguida; só garante que saímos
      // da tela de espera caso o servidor já tenha resolvido antes de
      // o jogador terminar de escolher (ex: veio pelo timeout).
      clearInterval(intervaloPorta);
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
        alvoTituloEl.textContent = "Você não tem poder nesta pergunta";
        jaEscolheuAlvo = true; // nada a fazer aqui, só aguardar
      }
      iniciarContadorRedondo(intervaloAlvo, anelAlvoEl, numeroAlvoEl, msg.tempoLimiteMs, (i) => (intervaloAlvo = i));
      break;
    }
    case "novaPergunta": {
      jaRespondeuEstaRodada = false;
      efeitosAtivosAtuais = [];
      alternativasBrutas = msg.alternativas;

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

      montarObstrucao(efeitosAtivosAtuais);
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
        renderizarPlacar(msg.placar, placarEl);
        prepararTelaResultado(botaoProxima, statusProximoEl);
      }, 1500);
      break;
    }

    case "iniciarLinking": {
      linkingTemaEl.textContent = msg.tema;
      linkingEsquerdaTextos = msg.esquerda;
      linkingDireitaTextos = msg.direita;
      linkingCorretosSet = new Set();
      linkingDireitaUsada = new Set();
      linkingTotalPares = msg.esquerda.length;
      linkingProgressoEl.textContent = `0 de ${linkingTotalPares} pares`;
      renderizarListaEsquerda();
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
      renderizarPlacar(msg.placar, placarLinkingEl);
      prepararTelaResultado(botaoContinuarLinking, statusContinuarLinkingEl);
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
      mostrarTela(telaResultadoSorting);
      sortingPontosEl.textContent = `+${msg.pontosGanhos} pontos (${msg.corretos} de ${msg.totalItens})`;
      sortingGabaritoEl.innerHTML = "";
      for (const item of msg.gabarito) {
        const li = document.createElement("li");
        const nomeCategoria = item.categoria === "A" ? sortingCategoriaANome : sortingCategoriaBNome;
        li.textContent = `${item.nome} — ${nomeCategoria}`;
        sortingGabaritoEl.appendChild(li);
      }
      renderizarPlacar(msg.placar, placarSortingEl);
      prepararTelaResultado(botaoContinuarSorting, statusContinuarSortingEl);
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
      const eu = msg.find((j) => j.id === meuJogadorId);
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
          li.innerHTML = `<span>${jogador.nome}</span><span>degrau ${jogador.posicao}</span>`;
          if (jogador.nome === msg.vencedorNome) li.classList.add("vencedor");
          piramidePosicoesFinaisEl.appendChild(li);
        });
      prepararTelaResultado(botaoContinuarPiramide, statusContinuarPiramideEl);
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
      fimTituloEl.textContent = msg.vencedorNome ? `🏆 ${msg.vencedorNome} venceu a partida!` : "Fim de partida!";
      renderizarPlacar(msg.placarFinal, placarFinalEl);
      break;
    }
    default:
      break;
  }
}

function renderizarListaSimples(jogadores) {
  listaJogadoresEl.innerHTML = "";
  for (const jogador of jogadores) {
    const li = document.createElement("li");
    li.textContent = jogador.nome + (jogador.ehAnfitriao ? " (anfitrião)" : "");
    listaJogadoresEl.appendChild(li);
  }
}

// guarda o próprio emoji/cor (sorteados pelo servidor na ordem de entrada)
// pra colorir a própria identidade e o destaque da resposta escolhida.
function atualizarMeuAvatar(jogadores) {
  const eu = jogadores.find((j) => j.id === meuJogadorId);
  if (!eu) return;
  meuNome = eu.nome;
  meuAvatar = eu.avatar || null;
  document.documentElement.style.setProperty("--cor-jogador", meuAvatar ? meuAvatar.cor : "#1e90ff");
  if (playerIdentityAvatarEl) playerIdentityAvatarEl.textContent = meuAvatar ? meuAvatar.emoji : "❔";
  if (playerIdentityNomeEl) playerIdentityNomeEl.textContent = meuNome;
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
    numeroEl.textContent = String(Math.ceil(restanteMs / 1000));
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

  ws.send(JSON.stringify({ type: "escolherPoder", tipo }));
}

function escolherAlvo(alvoId, botaoClicado) {
  if (jaEscolheuAlvo) return;
  jaEscolheuAlvo = true;

  document.querySelectorAll("#alvo-lista button").forEach((b) => (b.disabled = true));
  botaoClicado.classList.add("selecionada");
  alvoUsadoMsgEl.textContent = "Poder usado!";
  alvoUsadoMsgEl.classList.remove("oculto");

  ws.send(JSON.stringify({ type: "escolherAlvoPoder", alvoId }));
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

  ws.send(JSON.stringify({ type: "escolherPorta", indice, garantir }));
  mostrarTela(telaAguardandoPorta);
}

function responder(indice, botaoClicado) {
  if (jaRespondeuEstaRodada) return;
  jaRespondeuEstaRodada = true;

  document.querySelectorAll("#alternativas .alternativa").forEach((b) => (b.disabled = true));
  botaoClicado.classList.add("selecionada");

  ws.send(JSON.stringify({ type: "responder", alternativaIndex: indice }));
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
  ws.send(JSON.stringify({ type: "tentarPar", esquerdaIndex, direitaIndex }));
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
  ws.send(JSON.stringify({ type: "classificarItem", itemIndex, categoria }));
}

function responderPiramide(indice, botaoClicado) {
  if (piramideJaRespondeu || botaoClicado.disabled) return;
  piramideJaRespondeu = true;
  botaoClicado.classList.add("selecionada");
  ws.send(JSON.stringify({ type: "responderPiramide", alternativaIndex: indice }));
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

botaoIniciar.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "iniciarPartida" }));
});

botaoProxima.addEventListener("click", () => confirmarContinuar(botaoProxima));
botaoContinuarLinking.addEventListener("click", () => confirmarContinuar(botaoContinuarLinking));
botaoContinuarSorting.addEventListener("click", () => confirmarContinuar(botaoContinuarSorting));
botaoContinuarPiramide.addEventListener("click", () => confirmarContinuar(botaoContinuarPiramide));

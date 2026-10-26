const crypto = require("crypto");
const QRCode = require("qrcode");
const { sortearPergunta, sortearPortas } = require("./perguntas");
const { sortearConjuntoAssociacao, embaralharParaJogador: embaralharAssociacaoParaJogador } = require("./associacoes");
const { sortearConjuntoClassificacao, embaralharParaJogador: embaralharClassificacaoParaJogador } = require("./classificacoes");
const { ANIMAIS, buscarAnimal } = require("./animais");
const { enviarEstadoAoJogador, enviarEstadoATv } = require("./estadoAtual");

// Os seis Jogos de Poder. Os três de ataque atrapalham a tela do alvo e não
// têm limite de uso; os três especiais têm cota e não atacam ninguém.
const PODERES_ATAQUE = ["congelamento", "mordicadores", "nevoa"];
const PODERES_ESPECIAIS = ["escudo", "aposta", "festa"];
const TIPOS_DE_PODER = [...PODERES_ATAQUE, ...PODERES_ESPECIAIS];
// Precisam que o jogador escolha um alvo. Escudo e Festa valem sem alvo.
const PODERES_COM_ALVO = [...PODERES_ATAQUE, "aposta"];

// Valores usados numa partida de verdade. Testes automatizados passam um
// objeto de opções menor pro construtor, pra não precisar esperar segundos
// reais de leitura/timeout a cada asserção.
const PADROES = {
  maxJogadores: ANIMAIS.length, // um animal por jogador

  // A partida: 5 temas de 3 perguntas, ficando mais difíceis, e depois de
  // cada tema um desafio - Ligação e Classificação alternando.
  totalRodadas: 5,
  perguntasPorRodada: 3,
  dificuldadesPorRodada: ["facil", "facil", "medio", "medio", "dificil"],
  desafiosPorRodada: ["linking", "sorting", "linking", "sorting", "linking"],

  // A escolha de poder acontece só nestas perguntas de cada tema (contando a
  // partir de 1). A primeira de cada tema abre limpa: no começo ninguém tem
  // pontos e não há em quem mirar com critério.
  perguntasComPoder: [2, 3],

  tempoLimitePortaMs: 10000,
  tempoEscolhaPoderMs: 10000, // tempo pra escolher qual poder usar (ou nenhum)
  tempoEscolhaAlvoMs: 20000, // tempo pra escolher em quem usar o poder escolhido
  tempoLeituraMs: 8000, // tempo pra ler a pergunta antes de poder responder
  tempoLimitePerguntaMs: 15000, // tempo de resposta, contado a partir do fim da leitura
  pontosBaseAcerto: 100,
  bonusVelocidadeMax: 100,

  // Jogos de Poder
  usosEscudo: 3, // por jogador, na partida inteira
  usosAposta: 3, // por jogador, na partida inteira
  premioAposta: 75, // só acrescenta: alvo errou, nada acontece
  temasComFesta: [2, 4], // Festa de Pontos aparece uma vez em cada um destes temas
  multiplicadorFesta: 2, // dobra só o acerto base, não o bônus de velocidade
  // a TV mostra quem atacou quem: um momento por jogador que usou poder
  tempoAnimacaoPorPoderMs: 2000,

  tempoLimiteLinkingMs: 30000,
  pontosPorParLinking: 40,
  bonusVelocidadeLinkingMax: 100, // só pra quem completa todos os pares

  tempoLimiteSortingMs: 30000,
  pontosPorItemSorting: 25, // sem bônus de velocidade, igual ao jogo original

  // Pirâmide: o chão é 0, os andares vão de 1 a `piramideAndares` e o topo é o
  // último. A pontuação das rodadas só decide de que andar cada um larga.
  piramideAndares: 8,
  piramideMaxPulos: 4, // ninguém larga mais alto que isso
  piramideCurva: 1.5, // >1 faz a vantagem crescer devagar no meio da tabela
  piramidePesoPontos: 0.5, // o resto do peso vem da colocação no placar
  // A TV mostra a pontuação virando andar antes da corrida. A duração acompanha
  // a animação: uma abertura, um tanto por jogador e por andar pulado, e o fim.
  largadaAberturaMs: 1000,
  largadaPorJogadorMs: 520,
  largadaPorPuloMs: 300,
  largadaFechamentoMs: 3200,
  // quem chega ao topo fica uns segundos comemorando antes do pódio
  pausaVencedorPiramideMs: 3500,

  pausaAposPortaMs: 2500, // tempo pra ler "o tema escolhido foi..."
  // quando alguém garante a porta, a votação é cortada e a tela do tema aparece
  // de repente (e ainda traz "fulano garantiu essa porta"): dá mais tempo de ler
  pausaAposPortaGarantidaMs: 5000,

  // quanto tempo um jogador que caiu no meio da partida fica reservado
  // (com pontos, animal e posição) esperando voltar, antes de ser removido
  tempoReconexaoMs: 60000,
};

function gerarCodigoSala() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I/O pra não confundir com 1/0
  let codigo = "";
  for (let i = 0; i < 4; i++) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }
  return codigo;
}

class Sala {
  constructor(opcoes = {}) {
    this.cfg = { ...PADROES, ...opcoes };

    this.codigo = gerarCodigoSala();
    // id -> { id, nome, pontos, ehAnfitriao, animalId, avatar, token, conectado, ws, timeoutRemocao }
    this.jogadores = new Map();
    // lobby | escolha_porta | escolha_poder | escolha_alvo | animacao_poderes
    // | leitura | pergunta | revelacao | linking | revelacao_linking | sorting
    // | revelacao_sorting | largada_piramide | piramide | vitoria_piramide | fim
    this.estado = "lobby";
    this.tvWs = null;
    this.linkControlador = null; // definido de fora (index.js), quando o IP local é conhecido
    this.qrCodeDataUrl = null;
    this._proximoIdJogador = 1;

    // progressão da partida
    this.rodadaAtual = 0;
    this.perguntaNaRodada = 0;
    this.categoriaRodadaAtual = null;
    this.idsPerguntasUsadas = [];
    this.temasJogados = []; // pra porta preferir assuntos novos
    this.idsAssociacoesUsadas = []; // pra não repetir desafio na mesma partida
    this.idsClassificacoesUsadas = [];

    // fase de escolha de porta
    this.portasAtuais = [];
    this.escolhasPorta = new Map(); // jogadorId -> indice da porta
    this.garantiasPorta = []; // [{ jogadorId, indice, nome }] - de quem usou o poder nesta rodada
    // quem já usou o poder de "garantir minha porta" - só 1x por jogador
    // na partida inteira, então isso NÃO é resetado por rodada.
    this.jogadoresQueUsaramPoderPorta = new Set();
    this._timeoutPorta = null;
    this._timeoutPausaPorta = null;

    // fase de pergunta
    this.perguntaAtual = null; // { ...pergunta, indiceCorreto, iniciadaEm, respostas }
    this._timeoutLeitura = null;
    this._timeoutPergunta = null;

    // Jogos de Poder da pergunta atual, em duas escolhas sequenciais: primeiro
    // qual poder usar, depois em quem usar.
    this.ofertasPoder = new Map(); // jogadorId -> [{ tipo, usos }] oferecidos nesta pergunta
    this.poderesEscolhidos = new Map(); // jogadorId -> tipo, ou null se escolheu não usar
    this.alvosEscolhidos = new Set(); // jogadorId que já resolveu a fase de alvo (escolheu ou não precisava)
    this.alvoDe = new Map(); // jogadorId -> alvoId, de quem usou poder com alvo
    this.efeitosAtivos = new Map(); // jogadorId (alvo) -> [{ tipo, deId, deNome }] que passaram pelo escudo
    this.protegidos = new Set(); // quem usou Escudo nesta pergunta
    this.apostas = []; // [{ apostadorId, alvoId }] desta pergunta
    this.festaAtiva = false; // alguém ativou a Festa de Pontos nesta pergunta
    this.sequenciaPoderes = []; // o que a TV anima, na ordem
    this._timeoutEscolhaPoder = null;
    this._timeoutEscolhaAlvo = null;
    this._timeoutAnimacao = null;

    // cotas da partida inteira
    this.usosPoder = new Map(); // jogadorId -> { escudo, aposta } restantes
    this.festaUsadaNosTemas = new Set(); // rodadas em que a Festa já foi usada

    // fase de Linking (desafio de associação)
    this.linkingAtual = null;
    this._timeoutLinking = null;

    // fase de Sorting (desafio de classificação)
    this.sortingAtual = null;
    this._timeoutSorting = null;

    // fase da Pirâmide do Conhecimento (finale) - corrida individual, cada
    // jogador tem sua própria pergunta e avança no próprio ritmo.
    this.piramideAtual = null;
    this._timeoutLargada = null;
    this._timeoutVencedor = null;

    // fase de revelação (todos precisam confirmar pra avançar) - genérica,
    // serve tanto pra pergunta simples quanto pra Linking e Sorting.
    this._faseRevelacaoAtual = null; // "pergunta" | "linking" | "sorting"
    this._aguardandoConfirmacao = false;
    this.confirmacoesProximo = new Set();

    // o que precisa ser guardado pra reenviar a tela da fase atual a quem
    // reconecta (celular ou TV) - ver estadoAtual.js
    this._inicioFase = null; // quando começou a fase atual com tempo (porta/poder/alvo/leitura)
    this._payloadPortaBase = null;
    this._payloadPortaEscolhida = null;
    this._payloadEscolhaPoder = null;
    this._payloadAnimacao = null;
    this._payloadLargada = null;
    this._payloadNovaPergunta = null;
    this._payloadFim = null;
    this._resultadoAtual = { porJogador: new Map(), tv: null, comum: null };
  }

  // ---------- gestão de conexões ----------

  registrarTv(ws) {
    this.tvWs = ws;
    this._enviar(ws, "estadoSala", this._resumoParaTv());
    // TV que recarregou no meio da partida volta direto pra tela da fase atual
    enviarEstadoATv(this);
  }

  // chamado de fora (index.js) assim que o IP local é conhecido - gera o
  // QR code (100% offline, a lib desenha localmente) e reenvia o estado
  // pra TV caso ela já esteja conectada.
  async definirLinkControlador(link) {
    this.linkControlador = link;
    try {
      this.qrCodeDataUrl = await QRCode.toDataURL(link, { margin: 1, width: 260 });
    } catch {
      this.qrCodeDataUrl = null;
    }
    if (this.tvWs) {
      this._enviar(this.tvWs, "estadoSala", this._resumoParaTv());
    }
  }

  adicionarJogador(nome, codigoSala, ws) {
    if (String(codigoSala || "").toUpperCase() !== this.codigo) {
      return { erro: "Código da sala inválido." };
    }
    if (this.jogadores.size >= this.cfg.maxJogadores) {
      return { erro: `Sala cheia (máximo ${this.cfg.maxJogadores} jogadores).` };
    }
    if (this.estado !== "lobby") {
      return { erro: "A partida já começou." };
    }

    const id = String(this._proximoIdJogador++);
    const ehAnfitriao = this.jogadores.size === 0;
    // o animal (emoji + cor) é escolhido pelo próprio jogador no lobby
    // o token é o "RG" desse jogador: com ele o celular consegue voltar pro
    // mesmo lugar se a conexão cair no meio da partida
    const token = crypto.randomBytes(16).toString("hex");
    this.jogadores.set(id, {
      id, nome, pontos: 0, ehAnfitriao, animalId: null, avatar: null,
      token, conectado: true, ws, timeoutRemocao: null,
    });

    this._enviar(ws, "entrouComSucesso", {
      jogadorId: id,
      token,
      ehAnfitriao,
      animais: ANIMAIS,
      jogadores: this._listaJogadoresPublica(),
    });
    this._transmitirParaTodos("jogadoresAtualizados", {
      jogadores: this._listaJogadoresPublica(),
    });
    this._enviarParaTv("jogadoresAtualizados", {
      jogadores: this._listaJogadoresPublica(),
    });

    return { jogadorId: id };
  }

  // Escolha (ou troca) de animal no lobby. Cada animal é de um jogador só;
  // se dois clicam no mesmo ao mesmo tempo, vale quem chegou primeiro ao servidor.
  escolherAnimal(jogadorId, animalId) {
    if (this.estado !== "lobby") {
      return { erro: "A partida já começou, não dá mais para trocar de animal." };
    }
    const jogador = this.jogadores.get(jogadorId);
    if (!jogador) {
      return { erro: "Jogador desconhecido." };
    }
    const animal = buscarAnimal(animalId);
    if (!animal) {
      return { erro: "Animal inválido." };
    }
    const dono = [...this.jogadores.values()].find((j) => j.animalId === animal.id);
    if (dono && dono.id !== jogadorId) {
      return { erro: `${animal.nome} já foi escolhido por outro jogador.` };
    }

    jogador.animalId = animal.id;
    jogador.avatar = { emoji: animal.emoji, cor: animal.cor, nome: animal.nome };

    this._enviar(jogador.ws, "animalEscolhido", { animalId: animal.id });
    this._transmitirParaTodos("jogadoresAtualizados", { jogadores: this._listaJogadoresPublica() });
    this._enviarParaTv("jogadoresAtualizados", { jogadores: this._listaJogadoresPublica() });
    return { ok: true };
  }

  // "Trocar animal": o animal atual volta a ficar livre na hora, pros outros
  // poderem pegar, e o jogador fica sem animal até escolher outro.
  liberarAnimal(jogadorId) {
    if (this.estado !== "lobby") {
      return { erro: "A partida já começou, não dá mais para trocar de animal." };
    }
    const jogador = this.jogadores.get(jogadorId);
    if (!jogador) {
      return { erro: "Jogador desconhecido." };
    }
    jogador.animalId = null;
    jogador.avatar = null;
    this._avisarListaJogadores();
    return { ok: true };
  }

  // Desliga a sala: cancela todos os timers pendentes (fases, confirmações,
  // prazos de reconexão). Usado quando o servidor fecha - nos testes, evita
  // que partidas abandonadas continuem rodando em segundo plano.
  encerrar() {
    this._cancelarTimersDeFase();
    this.estado = "encerrada";
    for (const jogador of this.jogadores.values()) clearTimeout(jogador.timeoutRemocao);
  }

  _cancelarTimersDeFase() {
    for (const t of [
      this._timeoutPorta, this._timeoutPausaPorta, this._timeoutLeitura, this._timeoutPergunta,
      this._timeoutEscolhaPoder, this._timeoutEscolhaAlvo, this._timeoutAnimacao,
      this._timeoutLinking, this._timeoutSorting, this._timeoutLargada, this._timeoutVencedor,
    ]) {
      clearTimeout(t);
    }
    this._aguardandoConfirmacao = false;
  }

  // a partida está rolando de verdade (não é lobby, nem a tela final)
  _partidaEmAndamento() {
    return !["lobby", "fim", "encerrada"].includes(this.estado);
  }

  // Volta a sala pro lobby, pronta pra outra partida: zera pontos e progresso,
  // mantém quem está conectado (com o animal que já escolheu) e tira quem caiu.
  voltarAoLobby(motivo = null) {
    this._cancelarTimersDeFase();
    this.estado = "lobby";

    // quem está desconectado não volta pro novo lobby (o animal dele fica livre)
    for (const [id, jogador] of [...this.jogadores]) {
      if (!jogador.conectado) {
        clearTimeout(jogador.timeoutRemocao);
        this.jogadores.delete(id);
      }
    }
    // se o anfitrião era um dos que saíram, alguém assume
    if (this.jogadores.size > 0 && ![...this.jogadores.values()].some((j) => j.ehAnfitriao)) {
      this.jogadores.values().next().value.ehAnfitriao = true;
    }

    for (const jogador of this.jogadores.values()) jogador.pontos = 0;

    this.rodadaAtual = 0;
    this.perguntaNaRodada = 0;
    this.categoriaRodadaAtual = null;
    this.idsPerguntasUsadas = [];
    this.temasJogados = [];
    this.idsAssociacoesUsadas = [];
    this.idsClassificacoesUsadas = [];
    this.portasAtuais = [];
    this.escolhasPorta = new Map();
    this.garantiasPorta = [];
    this.jogadoresQueUsaramPoderPorta = new Set(); // todo mundo recupera o poder da porta
    this.perguntaAtual = null;
    this._limparPoderesDaPergunta();
    this.usosPoder = new Map(); // as cotas voltam cheias na próxima partida
    this.festaUsadaNosTemas = new Set();
    this.linkingAtual = null;
    this.sortingAtual = null;
    this.piramideAtual = null;
    this._faseRevelacaoAtual = null;
    this.confirmacoesProximo = new Set();
    this._inicioFase = null;
    this._payloadPortaBase = null;
    this._payloadPortaEscolhida = null;
    this._payloadEscolhaPoder = null;
    this._payloadAnimacao = null;
    this._payloadLargada = null;
    this._payloadNovaPergunta = null;
    this._payloadFim = null;
    this._resetarResultado();

    const payload = { motivo, jogadores: this._listaJogadoresPublica() };
    this._transmitirParaTodos("voltouAoLobby", payload);
    this._enviarParaTv("voltouAoLobby", payload);
  }

  // Reinício manual (5 toques na pílula do jogador + confirmação): vale a
  // qualquer momento, inclusive no meio da partida, pra destravar o jogo.
  pedirReiniciar(jogadorId) {
    const jogador = this.jogadores.get(jogadorId);
    if (!jogador || !jogador.ehAnfitriao) {
      return { erro: "Só o anfitrião pode reiniciar o jogo." };
    }
    const tinhaPartida = this.estado !== "lobby";
    this.voltarAoLobby(tinhaPartida ? "O anfitrião reiniciou o jogo." : null);
    return { ok: true };
  }

  // Só o anfitrião pode levar todo mundo de volta ao início, e só depois que a
  // partida terminou.
  pedirVoltarAoLobby(jogadorId) {
    const jogador = this.jogadores.get(jogadorId);
    if (!jogador || !jogador.ehAnfitriao) {
      return { erro: "Só o anfitrião pode voltar ao início." };
    }
    if (this.estado !== "fim") {
      return { erro: "A partida ainda está em andamento." };
    }
    this.voltarAoLobby();
    return { ok: true };
  }

  // Jogadores "ativos" = com o celular conectado agora. Quem caiu no meio da
  // partida continua na sala (esperando voltar), mas não segura o jogo.
  _ativos() {
    return [...this.jogadores.values()].filter((j) => j.conectado);
  }

  // true quando TODOS os jogadores conectados já estão em `colecao` (Set/Map
  // com .has(id)). Sem nenhum conectado, nada avança sozinho.
  _todosAtivosEm(colecao) {
    const ativos = this._ativos();
    return ativos.length > 0 && ativos.every((j) => colecao.has(j.id));
  }

  _avisarListaJogadores() {
    const dados = { jogadores: this._listaJogadoresPublica() };
    this._transmitirParaTodos("jogadoresAtualizados", dados);
    this._enviarParaTv("jogadoresAtualizados", dados);
  }

  // A conexão de um jogador fechou. No lobby ele sai na hora (o animal volta
  // a ficar livre); durante a partida ele fica reservado por
  // `tempoReconexaoMs` esperando voltar com o token.
  removerJogadorPorWs(ws) {
    for (const jogador of this.jogadores.values()) {
      if (jogador.ws !== ws) continue;
      if (this.estado === "lobby") {
        this._removerJogador(jogador.id);
      } else {
        this._marcarDesconectado(jogador);
      }
      return;
    }
  }

  _marcarDesconectado(jogador) {
    jogador.ws = null;
    jogador.conectado = false;
    clearTimeout(jogador.timeoutRemocao);
    jogador.timeoutRemocao = setTimeout(() => {
      if (this.jogadores.get(jogador.id) === jogador && !jogador.conectado) {
        this._removerJogador(jogador.id);
      }
    }, this.cfg.tempoReconexaoMs);
    // não deixa esse timer sozinho segurar o processo aberto
    if (jogador.timeoutRemocao.unref) jogador.timeoutRemocao.unref();

    this._avisarListaJogadores();
    this._verificarAvancoAposSaida();
  }

  _removerJogador(id) {
    const jogador = this.jogadores.get(id);
    if (!jogador) return;
    clearTimeout(jogador.timeoutRemocao);
    this.jogadores.delete(id);
    if (jogador.ehAnfitriao && this.jogadores.size > 0) {
      const proximo = this._ativos()[0] || this.jogadores.values().next().value;
      proximo.ehAnfitriao = true;
    }
    this._avisarListaJogadores();

    // Quem caiu teve o tempo de reconexão pra voltar e não voltou. Se a partida
    // ficou com um jogador só (ou nenhum), não dá pra continuar: encerra e volta
    // todo mundo pra tela de início. Enquanto o tempo de reconexão não acaba, a
    // partida continua - quem voltar reentra no lugar em que estava.
    if (this._partidaEmAndamento() && this.jogadores.size <= 1) {
      this.voltarAoLobby("Os outros jogadores não voltaram, então a partida foi encerrada.");
      return;
    }

    this._verificarAvancoAposSaida();
  }

  // Volta um jogador que caiu: confere o token, troca a conexão antiga pela
  // nova e reenvia a tela da fase em que a partida está agora.
  reconectarJogador(token, codigoSala, ws) {
    if (String(codigoSala || "").toUpperCase() !== this.codigo) {
      return { erro: "Código da sala inválido." };
    }
    const jogador = token
      ? [...this.jogadores.values()].find((j) => j.token === token)
      : null;
    if (!jogador) {
      return { erro: "Sua vaga na partida expirou. Entre na sala de novo." };
    }

    const antigo = jogador.ws;
    jogador.ws = ws;
    jogador.conectado = true;
    clearTimeout(jogador.timeoutRemocao);
    // a conexão antiga pode ainda estar "viva" pro servidor (queda sem aviso):
    // derruba, senão ela ficaria segurando a vaga
    if (antigo && antigo !== ws) {
      try { antigo.terminate(); } catch { /* já estava fechada */ }
    }

    this._enviar(ws, "reconectado", {
      jogadorId: jogador.id,
      ehAnfitriao: jogador.ehAnfitriao,
      estado: this.estado,
      animais: ANIMAIS,
      jogadores: this._listaJogadoresPublica(),
    });
    this._avisarListaJogadores();
    enviarEstadoAoJogador(this, jogador);
    return { jogadorId: jogador.id };
  }

  // Se quem saiu (ou caiu) era o único que faltava confirmar/escolher/terminar,
  // o jogo não deve ficar esperando por ele.
  _verificarAvancoAposSaida() {
    const ativos = this._ativos();
    if (ativos.length === 0) return;

    if (this._aguardandoConfirmacao && this._todosAtivosEm(this.confirmacoesProximo)) {
      this._aguardandoConfirmacao = false;
      this._avancarAposResultado();
    } else if (this.estado === "escolha_poder" && this._todosAtivosEm(this.poderesEscolhidos)) {
      clearTimeout(this._timeoutEscolhaPoder);
      this._resolverEscolhaPoder();
    } else if (this.estado === "escolha_alvo" && this._todosAtivosEm(this.alvosEscolhidos)) {
      clearTimeout(this._timeoutEscolhaAlvo);
      this._resolverEscolhaAlvo();
    } else if (
      this.estado === "pergunta" &&
      this.perguntaAtual &&
      this._todosAtivosEm(this.perguntaAtual.respostas)
    ) {
      clearTimeout(this._timeoutPergunta);
      this._revelarResultado();
    } else if (
      this.estado === "linking" &&
      this.linkingAtual &&
      ativos.every((j) => this.linkingAtual.progresso.get(j.id).completoEmMs !== null)
    ) {
      clearTimeout(this._timeoutLinking);
      this._revelarLinking();
    } else if (
      this.estado === "sorting" &&
      this.sortingAtual &&
      ativos.every((j) => {
        const p = this.sortingAtual.progresso.get(j.id);
        return p.respondidos.size >= p.itens.length;
      })
    ) {
      clearTimeout(this._timeoutSorting);
      this._revelarSorting();
    }
  }

  // ---------- fluxo do jogo ----------

  iniciarPartida(jogadorId) {
    const jogador = this.jogadores.get(jogadorId);
    if (!jogador || !jogador.ehAnfitriao) {
      return { erro: "Só o anfitrião pode iniciar a partida." };
    }
    if (this.jogadores.size < 2) {
      return { erro: "Precisa de pelo menos 2 jogadores." };
    }
    if ([...this.jogadores.values()].some((j) => !j.animalId)) {
      return { erro: "Todos os jogadores precisam escolher um animal antes de iniciar." };
    }
    this.usosPoder = new Map();
    for (const id of this.jogadores.keys()) this._usos(id); // cotas cheias pra todo mundo
    this.festaUsadaNosTemas = new Set();
    this.rodadaAtual = 1;
    this._iniciarEscolhaPorta();
    return { ok: true };
  }

  registrarEscolhaPorta(jogadorId, indice, garantir) {
    if (this.estado !== "escolha_porta") {
      return { erro: "Não há escolha de porta em aberto no momento." };
    }
    if (indice < 0 || indice >= this.portasAtuais.length) {
      return { erro: "Porta inválida." };
    }

    const jogador = this.jogadores.get(jogadorId);

    // A porta já foi decidida (alguém garantiu primeiro, ou o tempo acabou) e
    // estamos na pausa do "o tema é...". Quem chegou agora não muda nada - e,
    // principalmente, NÃO gasta o poder de garantir: ele continua valendo pras
    // próximas rodadas. Não é erro do jogador, então não devolve mensagem de
    // erro, só avisa que o poder não foi usado.
    if (this.categoriaRodadaAtual !== null) {
      if (garantir && jogador && !this.jogadoresQueUsaramPoderPorta.has(jogadorId)) {
        this._enviar(jogador.ws, "poderPortaDevolvido", {
          categoria: this.categoriaRodadaAtual,
          garantidaPorNome: this.garantiasPorta.length > 0 ? this.garantiasPorta[0].nome : null,
        });
      }
      return { ok: true };
    }

    if (garantir) {
      if (this.jogadoresQueUsaramPoderPorta.has(jogadorId)) {
        return { erro: "Você já usou seu poder de garantir a porta nesta partida." };
      }
      this.jogadoresQueUsaramPoderPorta.add(jogadorId);
      this.garantiasPorta.push({ jogadorId, indice, nome: jogador.nome });
    }
    this.escolhasPorta.set(jogadorId, indice);

    this._enviarParaTv("progressoPortas", {
      contagens: this._contarVotosPorta(),
    });

    // Porta garantida vence de qualquer jeito, então não há por que esperar o
    // resto do tempo: decide na hora e todo mundo já vê o tema da rodada.
    if (garantir) {
      clearTimeout(this._timeoutPorta);
      this._resolverPorta();
      return { ok: true };
    }

    // Sem garantia, a revelação só acontece quando o tempo da votação acabar -
    // mesmo que todo mundo já tenha escolhido antes disso, propositalmente
    // não resolve na hora (é o que dá a demora/suspense do sorteio).
    return { ok: true };
  }

  registrarResposta(jogadorId, alternativaIndex) {
    if (this.estado === "leitura") {
      return { erro: "Aguarde o tempo de leitura antes de responder." };
    }
    if (this.estado !== "pergunta" || !this.perguntaAtual) {
      return { erro: "Não há pergunta em aberto no momento." };
    }
    if (this.perguntaAtual.respostas.has(jogadorId)) {
      return { erro: "Você já respondeu essa pergunta." };
    }

    const agora = Date.now();
    this.perguntaAtual.respostas.set(jogadorId, {
      alternativaIndex,
      tempoMs: agora - this.perguntaAtual.iniciadaEm,
    });

    this._enviarParaTv("progressoRespostas", {
      respondidos: this.perguntaAtual.respostas.size,
      total: this.jogadores.size,
      jogadoresQueResponderam: [...this.perguntaAtual.respostas.keys()],
    });

    if (this._todosAtivosEm(this.perguntaAtual.respostas)) {
      clearTimeout(this._timeoutPergunta);
      this._revelarResultado();
    }

    return { ok: true };
  }

  // `tipo` null (ou "nenhum") é o botão "Não usar poder": registra a decisão
  // pra fase poder acabar assim que todos tiverem decidido, sem esperar o tempo.
  registrarEscolhaPoder(jogadorId, tipo) {
    if (this.estado !== "escolha_poder") {
      return { erro: "Não há escolha de poder em aberto no momento." };
    }
    if (this.poderesEscolhidos.has(jogadorId)) {
      return { erro: "Você já escolheu seu poder nesta pergunta." };
    }

    if (tipo === null || tipo === undefined || tipo === "nenhum") {
      this.poderesEscolhidos.set(jogadorId, null);
    } else {
      if (!TIPOS_DE_PODER.includes(tipo)) {
        return { erro: "Tipo de poder inválido." };
      }
      // só vale o que foi oferecido a este jogador nesta pergunta - é o que
      // garante as cotas e a Festa só nos temas dela
      const oferta = this.ofertasPoder.get(jogadorId) || [];
      if (!oferta.some((o) => o.tipo === tipo)) {
        return { erro: "Esse poder não está disponível pra você nesta pergunta." };
      }
      this.poderesEscolhidos.set(jogadorId, tipo);

      // Escudo e Festa não têm alvo: valem na hora em que são escolhidos.
      if (tipo === "escudo") {
        this._usos(jogadorId).escudo--;
        this.protegidos.add(jogadorId);
      }
      if (tipo === "festa") {
        // dois jogadores podem ter recebido a Festa na mesma pergunta; a festa
        // não acumula (dobro é dobro) e o tema só gasta a dele uma vez
        this.festaAtiva = true;
        this.festaUsadaNosTemas.add(this.rodadaAtual);
      }
    }

    if (this._todosAtivosEm(this.poderesEscolhidos)) {
      clearTimeout(this._timeoutEscolhaPoder);
      this._resolverEscolhaPoder();
    }

    return { ok: true };
  }

  registrarEscolhaAlvoPoder(jogadorId, alvoId) {
    if (this.estado !== "escolha_alvo") {
      return { erro: "Não há escolha de alvo em aberto no momento." };
    }
    const tipo = this.poderesEscolhidos.get(jogadorId);
    if (!tipo) {
      return { erro: "Você não escolheu um poder pra usar nesta pergunta." };
    }
    if (!PODERES_COM_ALVO.includes(tipo)) {
      return { erro: "Esse poder não precisa de alvo." };
    }
    if (this.alvosEscolhidos.has(jogadorId)) {
      return { erro: "Você já escolheu seu alvo nesta pergunta." };
    }
    if (alvoId === jogadorId) {
      return { erro: "Não dá pra usar um poder em si mesmo." };
    }
    const alvo = this.jogadores.get(alvoId);
    if (!alvo) {
      return { erro: "Alvo inválido." };
    }

    const jogador = this.jogadores.get(jogadorId);
    this.alvosEscolhidos.add(jogadorId);
    this.alvoDe.set(jogadorId, alvoId);

    if (tipo === "aposta") {
      // a cota só sai quando a aposta é feita de verdade, com alvo. E nada é
      // mandado pro alvo: ele não pode saber que foi apostado, senão muda o
      // jeito de responder.
      this._usos(jogadorId).aposta--;
      this.apostas.push({ apostadorId: jogadorId, alvoId });
    } else if (!this.protegidos.has(alvoId)) {
      // ataque que bate em escudo é descartado aqui mesmo: não chega à tela
      this.efeitosAtivos.set(alvoId, [
        ...(this.efeitosAtivos.get(alvoId) || []),
        { tipo, deId: jogadorId, deNome: jogador.nome },
      ]);
    }

    if (this._todosAtivosEm(this.alvosEscolhidos)) {
      clearTimeout(this._timeoutEscolhaAlvo);
      this._resolverEscolhaAlvo();
    }

    return { ok: true };
  }

  registrarTentativaPar(jogadorId, esquerdaIndex, direitaIndex) {
    if (this.estado !== "linking" || !this.linkingAtual) {
      return { erro: "Não há desafio de associação em aberto no momento." };
    }
    const progresso = this.linkingAtual.progresso.get(jogadorId);
    if (!progresso) {
      return { erro: "Jogador desconhecido." };
    }
    const totalPares = this.linkingAtual.pares.length;
    if (
      !Number.isInteger(esquerdaIndex) || !Number.isInteger(direitaIndex) ||
      esquerdaIndex < 0 || esquerdaIndex >= totalPares ||
      direitaIndex < 0 || direitaIndex >= totalPares
    ) {
      return { erro: "Índice inválido." };
    }
    if (progresso.completoEmMs !== null) {
      return { erro: "Você já completou este desafio." };
    }
    if (progresso.corretos.has(esquerdaIndex)) {
      return { erro: "Esse item já foi ligado corretamente." };
    }
    if (progresso.direitaUsada.has(direitaIndex)) {
      return { erro: "Essa opção já foi usada em outro par." };
    }

    // cada jogador tem seu próprio embaralhamento da coluna da direita
    const correto = progresso.direitaEmbaralhadaIndices[direitaIndex] === esquerdaIndex;
    if (correto) {
      progresso.corretos.add(esquerdaIndex);
      progresso.direitaUsada.add(direitaIndex);
      if (progresso.corretos.size >= totalPares) {
        progresso.completoEmMs = Date.now() - this.linkingAtual.iniciadaEm;
      }
    }

    const jogador = this.jogadores.get(jogadorId);
    this._enviar(jogador.ws, "resultadoTentativaPar", {
      esquerdaIndex,
      direitaIndex,
      correto,
      completou: progresso.completoEmMs !== null,
    });
    this._enviarParaTv("progressoLinking", { jogadores: this._progressoLinkingParaTv() });

    const ativosLinking = this._ativos();
    const todosCompletos =
      ativosLinking.length > 0 &&
      ativosLinking.every((j) => this.linkingAtual.progresso.get(j.id).completoEmMs !== null);
    if (todosCompletos) {
      clearTimeout(this._timeoutLinking);
      this._revelarLinking();
    }

    return { ok: true };
  }

  registrarClassificacaoItem(jogadorId, itemIndex, categoria) {
    if (this.estado !== "sorting" || !this.sortingAtual) {
      return { erro: "Não há desafio de classificação em aberto no momento." };
    }
    const progresso = this.sortingAtual.progresso.get(jogadorId);
    if (!progresso) {
      return { erro: "Jogador desconhecido." };
    }
    if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= progresso.itens.length) {
      return { erro: "Item inválido." };
    }
    if (categoria !== "A" && categoria !== "B") {
      return { erro: "Categoria inválida." };
    }
    if (progresso.respondidos.has(itemIndex)) {
      return { erro: "Você já classificou esse item." };
    }

    progresso.respondidos.set(itemIndex, categoria);
    // cada jogador tem sua própria ordem de itens, com seu próprio gabarito
    const correto = progresso.gabarito[itemIndex] === categoria;

    const jogador = this.jogadores.get(jogadorId);
    this._enviar(jogador.ws, "resultadoClassificacaoItem", { itemIndex, correto });
    this._enviarParaTv("progressoSorting", { jogadores: this._progressoSortingParaTv() });

    const ativosSorting = this._ativos();
    const todosCompletos =
      ativosSorting.length > 0 &&
      ativosSorting.every((j) => {
        const p = this.sortingAtual.progresso.get(j.id);
        return p.respondidos.size >= p.itens.length;
      });
    if (todosCompletos) {
      clearTimeout(this._timeoutSorting);
      this._revelarSorting();
    }

    return { ok: true };
  }

  registrarRespostaPiramide(jogadorId, alternativaIndex) {
    if (this.estado !== "piramide" || !this.piramideAtual) {
      return { erro: "A Pirâmide do Conhecimento não está em andamento." };
    }
    const progresso = this.piramideAtual.progresso.get(jogadorId);
    if (!progresso) {
      return { erro: "Jogador desconhecido." };
    }
    if (!progresso.perguntaAtual) {
      return { erro: "Você já terminou sua participação na pirâmide." };
    }
    if (progresso.perguntaAtual.tentativasErradas.has(alternativaIndex)) {
      return { erro: "Essa alternativa já foi tentada nesta pergunta." };
    }

    const jogador = this.jogadores.get(jogadorId);
    const correto = alternativaIndex === progresso.perguntaAtual.indiceCorreto;

    if (!correto) {
      progresso.perguntaAtual.tentativasErradas.add(alternativaIndex);
      this._enviar(jogador.ws, "respostaErradaPiramide", { alternativaIndex });
      return { ok: true };
    }

    // cada acerto sobe um andar
    progresso.posicao++;
    const progressoParaTodos = {
      jogadores: this._progressoPiramideParaTodos(),
      subiuId: jogadorId, // a TV anima o pulo de quem acabou de acertar
    };
    this._transmitirParaTodos("progressoPiramide", progressoParaTodos);
    this._enviarParaTv("progressoPiramide", progressoParaTodos);

    if (progresso.posicao >= this.cfg.piramideAndares) {
      this._vencerPiramide(jogadorId);
    } else {
      this._proximaPerguntaPiramide(jogadorId);
    }

    return { ok: true };
  }

  registrarContinuar(jogadorId) {
    if (!this._aguardandoConfirmacao) {
      return { erro: "Não há nada para confirmar no momento." };
    }
    if (!this.jogadores.has(jogadorId)) {
      return { erro: "Jogador desconhecido." };
    }
    this.confirmacoesProximo.add(jogadorId);

    const progresso = this._progressoConfirmacao();
    this._transmitirParaTodos("progressoContinuar", progresso);
    this._enviarParaTv("progressoContinuar", progresso);

    if (this._todosAtivosEm(this.confirmacoesProximo)) {
      this._aguardandoConfirmacao = false;
      this._avancarAposResultado();
    }

    return { ok: true };
  }

  // quantos dos jogadores conectados já apertaram "continuar"
  _progressoConfirmacao() {
    const ativos = this._ativos();
    return {
      confirmados: ativos.filter((j) => this.confirmacoesProximo.has(j.id)).length,
      total: ativos.length,
    };
  }

  // ---------- internos: escolha de porta ----------

  // nível das perguntas do tema atual ("facil" | "medio" | "dificil")
  _dificuldadeDaRodada() {
    const lista = this.cfg.dificuldadesPorRodada || [];
    return lista[this.rodadaAtual - 1] || null;
  }

  _iniciarEscolhaPorta() {
    this.estado = "escolha_porta";
    this.perguntaNaRodada = 0;
    this.categoriaRodadaAtual = null;
    // só entra porta de tema que aguenta as perguntas da rodada no nível dela
    this.portasAtuais = sortearPortas(4, {
      dificuldade: this._dificuldadeDaRodada(),
      idsExcluidos: this.idsPerguntasUsadas,
      temasJogados: this.temasJogados,
      minimo: this.cfg.perguntasPorRodada,
    });
    this.escolhasPorta = new Map();
    this.garantiasPorta = [];

    const payloadBase = {
      rodadaAtual: this.rodadaAtual,
      totalRodadas: this.cfg.totalRodadas,
      dificuldade: this._dificuldadeDaRodada(),
      portas: this.portasAtuais,
      tempoLimiteMs: this.cfg.tempoLimitePortaMs,
    };
    this._payloadPortaBase = payloadBase;
    this._payloadPortaEscolhida = null;
    this._inicioFase = Date.now();
    // "poderPortaDisponivel" é por jogador (só pode ser usado 1x na
    // partida inteira), por isso manda individual em vez de transmitir.
    for (const [id, jogador] of this.jogadores) {
      this._enviar(jogador.ws, "escolhaPorta", {
        ...payloadBase,
        poderPortaDisponivel: !this.jogadoresQueUsaramPoderPorta.has(id),
      });
    }
    this._enviarParaTv("escolhaPorta", payloadBase);

    this._timeoutPorta = setTimeout(() => {
      if (this.estado === "escolha_porta") this._resolverPorta();
    }, this.cfg.tempoLimitePortaMs + 500);
  }

  _contarVotosPorta() {
    const contagens = new Array(this.portasAtuais.length).fill(0);
    for (const indice of this.escolhasPorta.values()) contagens[indice]++;
    return contagens;
  }

  _resolverPorta() {
    if (this.estado !== "escolha_porta") return;
    if (this.categoriaRodadaAtual !== null) return; // já resolvida (garantia + timeout no mesmo instante)

    const contagens = this._contarVotosPorta();
    let indiceVencedor;
    let garantidaPorNome = null;

    if (this.garantiasPorta.length > 0) {
      // alguém usou o poder de garantir a própria porta - ela vence
      // mesmo se tiver menos votos que as outras. Se mais de um jogador
      // usou o poder na mesma rodada (raro), vale a primeira ativação.
      const escolhida = this.garantiasPorta[0];
      indiceVencedor = escolhida.indice;
      garantidaPorNome = escolhida.nome;
    } else {
      const maiorVotos = Math.max(...contagens);
      const vencedoras =
        maiorVotos > 0
          ? contagens.reduce((acc, v, i) => (v === maiorVotos ? [...acc, i] : acc), [])
          : this.portasAtuais.map((_, i) => i); // ninguém escolheu: sorteia entre todas
      indiceVencedor = vencedoras[Math.floor(Math.random() * vencedoras.length)];
    }

    this.categoriaRodadaAtual = this.portasAtuais[indiceVencedor];
    this.temasJogados.push(this.categoriaRodadaAtual);

    const payload = { categoria: this.categoriaRodadaAtual, contagens, garantidaPorNome };
    this._payloadPortaEscolhida = payload;
    this._transmitirParaTodos("portaEscolhida", payload);
    this._enviarParaTv("portaEscolhida", payload);

    const pausaMs = garantidaPorNome
      ? this.cfg.pausaAposPortaGarantidaMs
      : this.cfg.pausaAposPortaMs;
    this._timeoutPausaPorta = setTimeout(() => {
      if (this.estado === "escolha_porta") this._prepararProximaPergunta();
    }, pausaMs);
  }

  // Entre uma pergunta e outra do mesmo tema: decide se a próxima tem fase de
  // poder antes (só a 2ª e a 3ª, por padrão) ou se vai direto pra pergunta.
  _prepararProximaPergunta() {
    const proxima = this.perguntaNaRodada + 1;
    if ((this.cfg.perguntasComPoder || []).includes(proxima)) {
      this._iniciarEscolhaPoder();
    } else {
      this._limparPoderesDaPergunta(); // pergunta limpa: nada da anterior sobra
      this._proximaPerguntaDaRodada();
    }
  }

  // ---------- internos: Jogos de Poder (escolha em duas etapas) ----------

  _usos(jogadorId) {
    if (!this.usosPoder.has(jogadorId)) {
      this.usosPoder.set(jogadorId, { escudo: this.cfg.usosEscudo, aposta: this.cfg.usosAposta });
    }
    return this.usosPoder.get(jogadorId);
  }

  // A Festa existe uma vez em cada tema da lista, sem passar de um pro outro.
  // Devolve quantas ainda restam na partida a partir deste tema (0 = fora).
  _festasRestantes() {
    const temas = this.cfg.temasComFesta || [];
    if (!temas.includes(this.rodadaAtual) || this.festaUsadaNosTemas.has(this.rodadaAtual)) return 0;
    return temas.filter((t) => t >= this.rodadaAtual && !this.festaUsadaNosTemas.has(t)).length;
  }

  // Os 3 de ataque sempre aparecem; o 4º é sorteado entre os especiais que o
  // jogador ainda pode usar. É sorteado aqui, e não no celular, para ficar
  // igual se ele recarregar a página.
  _montarOferta(jogadorId) {
    const fixos = PODERES_ATAQUE.map((tipo) => ({ tipo, usos: null }));
    const usos = this._usos(jogadorId);
    const especiais = [];
    if (usos.escudo > 0) especiais.push({ tipo: "escudo", usos: usos.escudo });
    if (usos.aposta > 0) especiais.push({ tipo: "aposta", usos: usos.aposta });
    const festas = this._festasRestantes();
    if (festas > 0) especiais.push({ tipo: "festa", usos: festas });
    if (especiais.length === 0) return fixos;
    return [...fixos, especiais[Math.floor(Math.random() * especiais.length)]];
  }

  // Zera tudo que é da pergunta (não as cotas, que são da partida).
  _limparPoderesDaPergunta() {
    this.ofertasPoder = new Map();
    this.poderesEscolhidos = new Map();
    this.alvosEscolhidos = new Set();
    this.alvoDe = new Map();
    this.efeitosAtivos = new Map();
    this.protegidos = new Set();
    this.apostas = [];
    this.festaAtiva = false;
    this.sequenciaPoderes = [];
  }

  _iniciarEscolhaPoder() {
    this.estado = "escolha_poder";
    this._limparPoderesDaPergunta();

    const payload = {
      rodadaAtual: this.rodadaAtual,
      totalRodadas: this.cfg.totalRodadas,
      perguntaNaRodada: this.perguntaNaRodada + 1,
      totalPerguntasPorRodada: this.cfg.perguntasPorRodada,
      tempoLimiteMs: this.cfg.tempoEscolhaPoderMs,
    };
    this._payloadEscolhaPoder = payload;
    this._inicioFase = Date.now();

    // cada um recebe a própria oferta (o 4º poder e os usos são pessoais)
    for (const [id, jogador] of this.jogadores) {
      const oferta = this._montarOferta(id);
      this.ofertasPoder.set(id, oferta);
      this._enviar(jogador.ws, "escolhaPoder", { ...payload, oferta });
    }
    this._enviarParaTv("escolhaPoder", payload);

    this._timeoutEscolhaPoder = setTimeout(() => {
      if (this.estado === "escolha_poder") this._resolverEscolhaPoder();
    }, this.cfg.tempoEscolhaPoderMs + 500);
  }

  _resolverEscolhaPoder() {
    if (this.estado !== "escolha_poder") return;
    this._iniciarEscolhaAlvo();
  }

  // Os outros jogadores, do líder para baixo, com animal e pontos: é o que
  // ajuda a decidir em quem usar o poder. Empate divide a posição.
  _alvosPossiveis(jogadorId) {
    const placar = this._placar();
    return placar
      .filter((j) => j.id !== jogadorId)
      .map((j) => ({
        id: j.id,
        nome: j.nome,
        avatar: j.avatar,
        pontos: j.pontos,
        posicao: placar.filter((o) => o.pontos > j.pontos).length + 1,
      }));
  }

  _payloadEscolhaAlvo(jogadorId, tempoLimiteMs) {
    const tipo = this.poderesEscolhidos.get(jogadorId) ?? null;
    if (!tipo) return { temPoder: false, precisaAlvo: false, tipo: null, tempoLimiteMs };
    if (!PODERES_COM_ALVO.includes(tipo)) {
      // Escudo e Festa já valeram na escolha: o celular só confirma e espera
      return { temPoder: true, precisaAlvo: false, tipo, tempoLimiteMs };
    }
    return {
      temPoder: true,
      precisaAlvo: true,
      tipo,
      alvosPossiveis: this._alvosPossiveis(jogadorId),
      ...(tipo === "aposta" ? { premioAposta: this.cfg.premioAposta } : {}),
      tempoLimiteMs,
    };
  }

  _iniciarEscolhaAlvo() {
    this.estado = "escolha_alvo";
    this.alvosEscolhidos = new Set();
    this._inicioFase = Date.now();

    for (const [id, jogador] of this.jogadores) {
      const payload = this._payloadEscolhaAlvo(id, this.cfg.tempoEscolhaAlvoMs);
      this._enviar(jogador.ws, "escolhaAlvo", payload);
      if (!payload.precisaAlvo) this.alvosEscolhidos.add(id); // não há alvo pra esperar
    }
    this._enviarParaTv("escolhaAlvo", { tempoLimiteMs: this.cfg.tempoEscolhaAlvoMs });

    this._timeoutEscolhaAlvo = setTimeout(() => {
      if (this.estado === "escolha_alvo") this._resolverEscolhaAlvo();
    }, this.cfg.tempoEscolhaAlvoMs + 500);

    // se ninguém precisa escolher alvo, não há por que esperar
    if (this._todosAtivosEm(this.alvosEscolhidos)) {
      clearTimeout(this._timeoutEscolhaAlvo);
      this._resolverEscolhaAlvo();
    }
  }

  _resolverEscolhaAlvo() {
    if (this.estado !== "escolha_alvo") return;
    this.sequenciaPoderes = this._montarSequenciaPoderes();
    if (this.sequenciaPoderes.length === 0) {
      this._proximaPerguntaDaRodada(); // ninguém usou nada: nada pra mostrar
      return;
    }
    this._iniciarAnimacaoPoderes();
  }

  // O que a TV mostra, um momento por jogador que usou poder, na ordem em que
  // entraram na sala (`this.jogadores` é um Map, já itera nessa ordem).
  //
  // Os escudos vão por último de propósito: o ataque voa achando que vai
  // acertar, e a defesa só se revela no impacto. O momento do próprio escudo
  // depois conta quantos ataques ele segurou.
  //
  // A Aposta não diz em quem foi: o alvo está olhando para a TV, e saber que
  // foi apostado mudaria o jeito de ele responder. Revela no placar.
  _montarSequenciaPoderes() {
    const momentos = [];
    const escudos = [];
    for (const [id] of this.jogadores) {
      const tipo = this.poderesEscolhidos.get(id);
      if (!tipo) continue;
      if (tipo === "escudo") {
        escudos.push(id);
        continue;
      }
      if (tipo === "festa") {
        momentos.push({ tipo, deId: id });
        continue;
      }
      const alvoId = this.alvoDe.get(id);
      // escolheu poder com alvo mas não escolheu o alvo a tempo: não usou
      if (!alvoId || !this.jogadores.has(alvoId)) continue;
      if (tipo === "aposta") {
        momentos.push({ tipo, deId: id });
        continue;
      }
      momentos.push({ tipo, deId: id, alvoId, bloqueado: this.protegidos.has(alvoId) });
    }
    for (const id of escudos) {
      const bloqueios = momentos.filter((m) => m.alvoId === id && m.bloqueado).length;
      momentos.push({ tipo: "escudo", deId: id, bloqueios });
    }
    return momentos;
  }

  _iniciarAnimacaoPoderes() {
    this.estado = "animacao_poderes";
    this._inicioFase = Date.now();
    const duracaoMs = this.sequenciaPoderes.length * this.cfg.tempoAnimacaoPorPoderMs;
    const payload = {
      sequencia: this.sequenciaPoderes,
      jogadores: this._listaJogadoresPublica(),
      duracaoPorPoderMs: this.cfg.tempoAnimacaoPorPoderMs,
      duracaoMs,
    };
    this._payloadAnimacao = payload;
    this._enviarParaTv("animacaoPoderes", payload);
    this._transmitirParaTodos("olheParaTv", { duracaoMs });

    this._timeoutAnimacao = setTimeout(() => {
      if (this.estado === "animacao_poderes") this._proximaPerguntaDaRodada();
    }, duracaoMs);
  }

  // ---------- internos: perguntas ----------

  _proximaPerguntaDaRodada() {
    this.perguntaNaRodada++;
    const sorteada = sortearPergunta(
      this.categoriaRodadaAtual,
      this.idsPerguntasUsadas,
      this._dificuldadeDaRodada()
    );
    this.idsPerguntasUsadas.push(sorteada.id);

    this.perguntaAtual = {
      ...sorteada,
      iniciadaEm: null, // só é marcado quando a janela de resposta abre, após a leitura
      respostas: new Map(),
    };
    this.estado = "leitura";

    const payload = {
      rodadaAtual: this.rodadaAtual,
      totalRodadas: this.cfg.totalRodadas,
      perguntaNaRodada: this.perguntaNaRodada,
      totalPerguntasPorRodada: this.cfg.perguntasPorRodada,
      pergunta: sorteada.pergunta,
      categoria: sorteada.categoria,
      dificuldade: sorteada.dificuldade,
      alternativas: sorteada.alternativas,
      tempoLeituraMs: this.cfg.tempoLeituraMs,
      tempoLimiteMs: this.cfg.tempoLimitePerguntaMs,
      festaAtiva: this.festaAtiva,
    };
    this._payloadNovaPergunta = payload;
    this._inicioFase = Date.now();
    this._transmitirParaTodos("novaPergunta", payload);
    this._enviarParaTv("novaPergunta", payload);

    this._timeoutLeitura = setTimeout(() => this._iniciarJanelaResposta(), this.cfg.tempoLeituraMs);
  }

  _iniciarJanelaResposta() {
    if (this.estado !== "leitura") return;
    this.estado = "pergunta";
    this.perguntaAtual.iniciadaEm = Date.now();

    for (const [id, jogador] of this.jogadores) {
      this._enviar(jogador.ws, "iniciarResposta", {
        tempoLimiteMs: this.cfg.tempoLimitePerguntaMs,
        efeitosAtivos: this.efeitosAtivos.get(id) || [],
        escudo: this._resumoEscudo(id),
        // a Névoa mostra o bônus de velocidade caindo enquanto o borrão some
        bonusVelocidadeMax: this.cfg.bonusVelocidadeMax,
      });
    }
    this._enviarParaTv("iniciarResposta", { tempoLimiteMs: this.cfg.tempoLimitePerguntaMs });

    this._timeoutPergunta = setTimeout(() => {
      if (this.estado === "pergunta") this._revelarResultado();
    }, this.cfg.tempoLimitePerguntaMs + 500);
  }

  _revelarResultado() {
    if (this.estado !== "pergunta") return;
    this.estado = "revelacao";
    this._resetarResultado();

    const { indiceCorreto, respostas } = this.perguntaAtual;
    // Festa de Pontos dobra só o acerto base; o bônus de velocidade fica igual,
    // senão uma pergunta sozinha valeria 400 e decidiria a partida.
    const base = this.cfg.pontosBaseAcerto * (this.festaAtiva ? this.cfg.multiplicadorFesta : 1);

    // Primeiro soma os pontos de TODO MUNDO; só depois monta o placar. Montar
    // o placar dentro deste laço daria, pra quem é processado antes, um placar
    // com os outros ainda sem os pontos da rodada (dois jogadores chegavam a
    // ver a mesma posição com pontuações diferentes).
    const ganhos = new Map();
    for (const [id] of this.jogadores) {
      const resposta = respostas.get(id);
      const acertou = !!resposta && resposta.alternativaIndex === indiceCorreto;
      let pontosPergunta = 0;
      if (acertou) {
        const fracaoRestante = Math.max(0, 1 - resposta.tempoMs / this.cfg.tempoLimitePerguntaMs);
        pontosPergunta = base + Math.round(this.cfg.bonusVelocidadeMax * fracaoRestante);
      }
      ganhos.set(id, { acertou, respondeu: !!resposta, pontosPergunta, aposta: null });
    }

    // Aposta: quem apostou ganha o prêmio se o alvo acertou. Só acrescenta.
    const apostasResolvidas = [];
    for (const { apostadorId, alvoId } of this.apostas) {
      const apostador = this.jogadores.get(apostadorId);
      const alvo = this.jogadores.get(alvoId);
      if (!apostador) continue; // saiu da partida
      const ganhou = !!alvo && ganhos.get(alvoId).acertou;
      const premio = ganhou ? this.cfg.premioAposta : 0;
      const resolvida = {
        apostadorId,
        apostadorNome: apostador.nome,
        alvoId,
        alvoNome: alvo ? alvo.nome : null,
        ganhou,
        premio,
      };
      apostasResolvidas.push(resolvida);
      ganhos.get(apostadorId).aposta = resolvida;
    }

    for (const [id, jogador] of this.jogadores) {
      const g = ganhos.get(id);
      g.pontosGanhos = g.pontosPergunta + (g.aposta ? g.aposta.premio : 0);
      jogador.pontos += g.pontosGanhos;
    }

    const placarFinal = this._placar(); // igual pra todos os celulares e pra TV
    for (const id of this.jogadores.keys()) {
      this._enviarResultado(id, "resultadoPergunta", {
        respostaCorretaIndex: indiceCorreto,
        seuResultado: ganhos.get(id),
        festaAtiva: this.festaAtiva,
        placar: placarFinal,
      });
    }

    // A TV precisa do ganho de cada um nesta pergunta pra montar o placar na
    // ordem anterior e depois deslizar as linhas para a posição nova.
    this._enviarResultadoTv("resultadoPergunta", {
      alternativas: this.perguntaAtual.alternativas,
      respostaCorretaIndex: indiceCorreto,
      respostasPorJogador: [...this.jogadores.values()].map((j) => {
        const resposta = respostas.get(j.id);
        return { id: j.id, nome: j.nome, alternativaIndex: resposta ? resposta.alternativaIndex : null };
      }),
      placar: placarFinal.map((j) => ({ ...j, ganho: ganhos.get(j.id).pontosGanhos })),
      apostas: apostasResolvidas,
      festaAtiva: this.festaAtiva,
    });

    this._faseRevelacaoAtual = "pergunta";
    this._iniciarEsperaConfirmacao();
  }

  // O que o celular de quem usou Escudo mostra: quantos ataques ele segurou.
  _resumoEscudo(jogadorId) {
    if (!this.protegidos.has(jogadorId)) return null;
    const bloqueados = [...this.alvoDe]
      .filter(([deId, alvoId]) => alvoId === jogadorId && PODERES_ATAQUE.includes(this.poderesEscolhidos.get(deId)))
      .length;
    return { bloqueados };
  }

  // ---------- internos: Linking (desafio de associação) ----------

  // Depois das perguntas de cada tema vem o desafio dele. Sem desafio
  // configurado pra rodada, segue direto.
  _iniciarDesafioDaRodada() {
    const desafio = (this.cfg.desafiosPorRodada || [])[this.rodadaAtual - 1];
    if (desafio === "linking") return this._iniciarLinking();
    if (desafio === "sorting") return this._iniciarSorting();
    this._aposDesafio();
  }

  // Fim do tema: o próximo, ou a Pirâmide se esse era o último.
  _aposDesafio() {
    if (this.rodadaAtual < this.cfg.totalRodadas) {
      this.rodadaAtual++;
      this._iniciarEscolhaPorta();
      return;
    }
    this._iniciarLargadaPiramide();
  }

  _iniciarLinking() {
    const conjunto = sortearConjuntoAssociacao(this.idsAssociacoesUsadas);
    this.idsAssociacoesUsadas.push(conjunto.id);
    this.linkingAtual = {
      id: conjunto.id,
      tema: conjunto.tema,
      pares: conjunto.pares, // ordem fixa, usada só na revelação (gabarito)
      iniciadaEm: Date.now(),
      progresso: new Map(),
    };
    this.estado = "linking";

    // cada jogador recebe seu próprio embaralhamento da coluna da direita -
    // senão todo mundo veria a mesma ordem e daria pra colar no vizinho.
    for (const [id, jogador] of this.jogadores) {
      const { direita, direitaEmbaralhadaIndices } = embaralharAssociacaoParaJogador(conjunto.pares);
      this.linkingAtual.progresso.set(id, {
        direita,
        direitaEmbaralhadaIndices,
        corretos: new Set(),
        direitaUsada: new Set(),
        completoEmMs: null,
      });

      this._enviar(jogador.ws, "iniciarLinking", {
        tema: conjunto.tema,
        esquerda: conjunto.pares.map((p) => p.esquerda),
        direita,
        tempoLimiteMs: this.cfg.tempoLimiteLinkingMs,
      });
    }
    this._enviarParaTv("iniciarLinking", {
      tema: conjunto.tema,
      tempoLimiteMs: this.cfg.tempoLimiteLinkingMs,
    });

    this._timeoutLinking = setTimeout(() => {
      if (this.estado === "linking") this._revelarLinking();
    }, this.cfg.tempoLimiteLinkingMs + 500);
  }

  _progressoLinkingParaTv() {
    return [...this.jogadores.values()].map((j) => {
      const p = this.linkingAtual.progresso.get(j.id);
      return { nome: j.nome, corretos: p.corretos.size, completou: p.completoEmMs !== null };
    });
  }

  _revelarLinking() {
    if (this.estado !== "linking") return;
    clearTimeout(this._timeoutLinking);
    this.estado = "revelacao_linking";
    this._resetarResultado();

    const totalPares = this.linkingAtual.pares.length;

    // soma os pontos de todos antes de montar o placar (ver _revelarResultado)
    const ganhos = new Map();
    for (const [id, jogador] of this.jogadores) {
      const p = this.linkingAtual.progresso.get(id);
      const fracaoRestante =
        p.completoEmMs !== null
          ? Math.max(0, 1 - p.completoEmMs / this.cfg.tempoLimiteLinkingMs)
          : 0;
      const pontosGanhos =
        p.corretos.size * this.cfg.pontosPorParLinking +
        (p.completoEmMs !== null
          ? Math.round(this.cfg.bonusVelocidadeLinkingMax * fracaoRestante)
          : 0);
      jogador.pontos += pontosGanhos;
      ganhos.set(id, { pontosGanhos, paresCorretos: p.corretos.size });
    }

    const placarFinal = this._placar();
    for (const id of this.jogadores.keys()) {
      this._enviarResultado(id, "resultadoLinking", {
        ...ganhos.get(id),
        totalPares,
        pares: this.linkingAtual.pares,
        placar: placarFinal,
      });
    }

    this._enviarResultadoTv("resultadoLinking", {
      pares: this.linkingAtual.pares,
      placar: placarFinal.map((j) => ({ ...j, ganho: ganhos.get(j.id).pontosGanhos })),
    });

    this._faseRevelacaoAtual = "linking";
    this._iniciarEsperaConfirmacao();
  }

  // ---------- internos: Sorting (desafio de classificação) ----------

  _iniciarSorting() {
    const conjunto = sortearConjuntoClassificacao(this.idsClassificacoesUsadas);
    this.idsClassificacoesUsadas.push(conjunto.id);
    this.sortingAtual = {
      id: conjunto.id,
      categoriaA: conjunto.categoriaA,
      categoriaB: conjunto.categoriaB,
      itensOriginais: conjunto.itens, // ordem fixa, usada só na revelação (gabarito)
      iniciadaEm: Date.now(),
      progresso: new Map(),
    };
    this.estado = "sorting";

    // cada jogador recebe sua própria ordem de itens - senão todo mundo veria
    // os itens na mesma posição e daria pra colar no vizinho.
    for (const [id, jogador] of this.jogadores) {
      const { itens, gabarito } = embaralharClassificacaoParaJogador(conjunto.itens);
      this.sortingAtual.progresso.set(id, { itens, gabarito, respondidos: new Map() });

      this._enviar(jogador.ws, "iniciarSorting", {
        categoriaA: conjunto.categoriaA,
        categoriaB: conjunto.categoriaB,
        itens,
        tempoLimiteMs: this.cfg.tempoLimiteSortingMs,
      });
    }
    this._enviarParaTv("iniciarSorting", {
      categoriaA: conjunto.categoriaA,
      categoriaB: conjunto.categoriaB,
      tempoLimiteMs: this.cfg.tempoLimiteSortingMs,
    });

    this._timeoutSorting = setTimeout(() => {
      if (this.estado === "sorting") this._revelarSorting();
    }, this.cfg.tempoLimiteSortingMs + 500);
  }

  _progressoSortingParaTv() {
    return [...this.jogadores.values()].map((j) => {
      const p = this.sortingAtual.progresso.get(j.id);
      return { nome: j.nome, respondidos: p.respondidos.size, total: p.itens.length };
    });
  }

  _revelarSorting() {
    if (this.estado !== "sorting") return;
    clearTimeout(this._timeoutSorting);
    this.estado = "revelacao_sorting";
    this._resetarResultado();

    const totalItens = this.sortingAtual.itensOriginais.length;
    const gabaritoCompleto = this.sortingAtual.itensOriginais.map((it) => ({
      nome: it.nome,
      categoria: it.categoria,
    }));

    // soma os pontos de todos antes de montar o placar (ver _revelarResultado)
    const ganhos = new Map();
    for (const [id, jogador] of this.jogadores) {
      const p = this.sortingAtual.progresso.get(id);
      let corretos = 0;
      for (const [itemIndex, categoria] of p.respondidos) {
        if (p.gabarito[itemIndex] === categoria) corretos++;
      }
      const pontosGanhos = corretos * this.cfg.pontosPorItemSorting;
      jogador.pontos += pontosGanhos;
      ganhos.set(id, { pontosGanhos, corretos });
    }

    const placarFinal = this._placar();
    for (const id of this.jogadores.keys()) {
      this._enviarResultado(id, "resultadoSorting", {
        categoriaA: this.sortingAtual.categoriaA,
        categoriaB: this.sortingAtual.categoriaB,
        ...ganhos.get(id),
        totalItens,
        gabarito: gabaritoCompleto,
        placar: placarFinal,
      });
    }

    this._enviarResultadoTv("resultadoSorting", {
      categoriaA: this.sortingAtual.categoriaA,
      categoriaB: this.sortingAtual.categoriaB,
      gabarito: gabaritoCompleto,
      placar: placarFinal.map((j) => ({ ...j, ganho: ganhos.get(j.id).pontosGanhos })),
    });

    this._faseRevelacaoAtual = "sorting";
    this._iniciarEsperaConfirmacao();
  }

  // ---------- internos: Pirâmide do Conhecimento (finale) ----------

  // A pontuação das rodadas vira o andar de largada. Não ganha a partida:
  // quem chega ao topo primeiro é quem vence.
  //
  //   tPontos = (pontos - MENOR) / (MAIOR - MENOR)   0 a 1
  //   tLugar  = (n - 1 - colocação) / (n - 1)        1 = primeiro, 0 = último
  //   t       = peso × tPontos + (1 - peso) × tLugar
  //   pulos   = arredondar(maxPulos × t^curva)       andar de largada (0 = chão)
  //
  // Metade vem da colocação porque só com pontos um líder disparado estica a
  // faixa e achata todo o resto no chão; a colocação garante que o placar
  // sempre vire andares diferentes, e os pontos mantêm a proporção.
  _calcularLargada() {
    const placar = this._placar();
    const pontos = placar.map((j) => j.pontos);
    const maior = Math.max(...pontos);
    const menor = Math.min(...pontos);
    const faixa = maior - menor;
    const n = placar.length;
    const { piramideMaxPulos: maxPulos, piramideCurva: curva, piramidePesoPontos: peso } = this.cfg;

    return placar.map((j) => {
      const tPontos = faixa === 0 ? 0 : (j.pontos - menor) / faixa;
      const colocacao = placar.findIndex((o) => o.pontos === j.pontos); // empate divide o lugar
      const tLugar = n <= 1 ? 0 : (n - 1 - colocacao) / (n - 1);
      const t = peso * tPontos + (1 - peso) * tLugar;
      const pulos = Math.round(maxPulos * Math.pow(t, curva));
      return {
        id: j.id,
        nome: j.nome,
        avatar: j.avatar,
        pontos: j.pontos,
        colocacao: colocacao + 1,
        pulos,
        largada: pulos,
        faltam: this.cfg.piramideAndares - pulos,
      };
    });
  }

  // Antes da corrida, a TV mostra a pontuação de cada um virando andar.
  _iniciarLargadaPiramide() {
    this.estado = "largada_piramide";
    const largada = this._calcularLargada();

    this.piramideAtual = { progresso: new Map() };
    for (const j of largada) {
      this.piramideAtual.progresso.set(j.id, { posicao: j.largada, largada: j.largada, perguntaAtual: null });
    }

    const c = this.cfg;
    const totalPulos = largada.reduce((soma, j) => soma + j.pulos, 0);
    const duracaoMs =
      c.largadaAberturaMs + largada.length * c.largadaPorJogadorMs +
      totalPulos * c.largadaPorPuloMs + c.largadaFechamentoMs;

    const payload = {
      totalAndares: c.piramideAndares,
      maxPulos: c.piramideMaxPulos,
      jogadores: largada,
      duracaoMs,
    };
    this._payloadLargada = payload;
    this._inicioFase = Date.now();
    this._transmitirParaTodos("largadaPiramide", payload);
    this._enviarParaTv("largadaPiramide", payload);

    this._timeoutLargada = setTimeout(() => {
      if (this.estado === "largada_piramide") this._iniciarPiramide();
    }, duracaoMs);
  }

  _iniciarPiramide() {
    this.estado = "piramide";
    const payload = {
      totalAndares: this.cfg.piramideAndares,
      jogadores: this._progressoPiramideParaTodos(),
    };
    this._transmitirParaTodos("iniciarPiramide", payload);
    this._enviarParaTv("iniciarPiramide", payload);

    for (const jogadorId of this.piramideAtual.progresso.keys()) {
      if (this.jogadores.has(jogadorId)) this._proximaPerguntaPiramide(jogadorId);
    }
  }

  _proximaPerguntaPiramide(jogadorId) {
    const progresso = this.piramideAtual.progresso.get(jogadorId);
    const sorteada = sortearPergunta(null, this.idsPerguntasUsadas);
    this.idsPerguntasUsadas.push(sorteada.id);

    progresso.perguntaAtual = {
      indiceCorreto: sorteada.indiceCorreto,
      tentativasErradas: new Set(),
      pergunta: sorteada.pergunta,
      categoria: sorteada.categoria,
      alternativas: sorteada.alternativas,
    };

    const jogador = this.jogadores.get(jogadorId);
    this._enviar(jogador.ws, "novaPerguntaPiramide", {
      pergunta: sorteada.pergunta,
      categoria: sorteada.categoria,
      alternativas: sorteada.alternativas,
    });
  }

  _progressoPiramideParaTodos() {
    return [...this.jogadores.values()].map((j) => {
      const p = this.piramideAtual.progresso.get(j.id);
      return {
        id: j.id,
        nome: j.nome,
        avatar: j.avatar,
        posicao: p?.posicao ?? 0, // 0 = chão, piramideAndares = topo
        largada: p?.largada ?? 0,
        conectado: j.conectado,
      };
    });
  }

  // Alguém chegou ao topo. A TV deixa o vencedor comemorando no alto da
  // pirâmide uns segundos, e depois vem o pódio - sem precisar de "continuar".
  _vencerPiramide(vencedorId) {
    this.estado = "vitoria_piramide";
    const vencedor = this.jogadores.get(vencedorId);
    this.piramideAtual.vencedorId = vencedorId;
    this.piramideAtual.vencedorNome = vencedor.nome;

    // ninguém mais precisa continuar respondendo depois que alguém venceu
    for (const progresso of this.piramideAtual.progresso.values()) {
      progresso.perguntaAtual = null;
    }

    const payload = {
      vencedorId,
      vencedorNome: vencedor.nome,
      jogadores: this._progressoPiramideParaTodos(),
    };
    this._transmitirParaTodos("vencedorPiramide", payload);
    this._enviarParaTv("vencedorPiramide", payload);

    this._timeoutVencedor = setTimeout(() => {
      if (this.estado === "vitoria_piramide") this._finalizarPartida();
    }, this.cfg.pausaVencedorPiramideMs);
  }

  // 1º é quem chegou ao topo, e só isso. Do 2º em diante vale o andar
  // alcançado; os pontos das rodadas só desempatam quem parou no mesmo andar.
  _classificacaoFinal() {
    const progresso = this.piramideAtual?.progresso;
    const topo = this.cfg.piramideAndares;
    const lista = [...this.jogadores.values()].map((j) => {
      const p = progresso?.get(j.id);
      const andarFinal = p?.posicao ?? 0;
      return {
        id: j.id,
        nome: j.nome,
        avatar: j.avatar,
        pontos: j.pontos,
        largada: p?.largada ?? 0,
        andarFinal,
        chegouAoTopo: andarFinal >= topo,
      };
    });
    lista.sort(
      (a, b) =>
        Number(b.chegouAoTopo) - Number(a.chegouAoTopo) ||
        b.andarFinal - a.andarFinal ||
        b.pontos - a.pontos
    );
    return lista.map((j, i) => ({ ...j, colocacao: i + 1 }));
  }

  // ---------- internos: confirmação genérica pra avançar ----------

  // Nas telas de resultado a partida só avança quando TODOS os jogadores
  // conectados apertarem "continuar" - não existe avanço automático por tempo.
  // (quem caiu não trava: ver _todosAtivosEm / _verificarAvancoAposSaida)
  _iniciarEsperaConfirmacao() {
    this.confirmacoesProximo = new Set();
    this._aguardandoConfirmacao = true;
  }

  // Ordem de cada tema: perguntas (com ou sem fase de poder) → desafio do
  // tema → próximo tema. Depois do último tema vem a Pirâmide.
  _avancarAposResultado() {
    if (this._faseRevelacaoAtual === "pergunta") {
      if (this.perguntaNaRodada < this.cfg.perguntasPorRodada) {
        this._prepararProximaPergunta();
        return;
      }
      this._iniciarDesafioDaRodada();
      return;
    }
    // resultado de Ligação ou Classificação: o tema acabou
    this._aposDesafio();
  }

  _finalizarPartida() {
    this.estado = "fim";
    const classificacao = this._classificacaoFinal();
    const payload = {
      classificacao,
      totalAndares: this.cfg.piramideAndares,
      vencedorId: this.piramideAtual?.vencedorId ?? null,
      vencedorNome: this.piramideAtual?.vencedorNome ?? null,
      placarFinal: this._placar(), // pontos das rodadas, a história da partida
    };
    this._payloadFim = payload;
    this._transmitirParaTodos("fimDePartida", payload);
    this._enviarParaTv("fimDePartida", payload);
  }

  // ---------- utilitários ----------

  // Resultado da fase de revelação: além de enviar, guarda o que cada jogador
  // (e a TV) viu, pra reenviar a quem reconectar nessa tela.
  _resetarResultado() {
    this._resultadoAtual = { porJogador: new Map(), tv: null, comum: null };
  }

  _enviarResultado(jogadorId, type, payload) {
    this._resultadoAtual.porJogador.set(jogadorId, { type, payload });
    const jogador = this.jogadores.get(jogadorId);
    if (jogador) this._enviar(jogador.ws, type, payload);
  }

  _enviarResultadoTv(type, payload) {
    this._resultadoAtual.tv = { type, payload };
    this._enviarParaTv(type, payload);
  }

  _placar() {
    return [...this.jogadores.values()]
      .map((j) => ({ id: j.id, nome: j.nome, avatar: j.avatar, pontos: j.pontos }))
      .sort((a, b) => b.pontos - a.pontos);
  }

  _listaJogadoresPublica() {
    return [...this.jogadores.values()].map((j) => ({
      id: j.id,
      nome: j.nome,
      ehAnfitriao: j.ehAnfitriao,
      pontos: j.pontos,
      animalId: j.animalId,
      avatar: j.avatar,
      conectado: j.conectado,
    }));
  }

  _resumoParaTv() {
    return {
      codigo: this.codigo,
      estado: this.estado,
      jogadores: this._listaJogadoresPublica(),
      linkControlador: this.linkControlador,
      qrCodeDataUrl: this.qrCodeDataUrl,
    };
  }

  _enviar(ws, type, dados) {
    if (ws && ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify({ type, ...dados }));
    }
  }

  _transmitirParaTodos(type, dados) {
    for (const jogador of this.jogadores.values()) {
      this._enviar(jogador.ws, type, dados);
    }
  }

  _enviarParaTv(type, dados) {
    this._enviar(this.tvWs, type, dados);
  }
}

module.exports = { Sala, PADROES, TIPOS_DE_PODER, PODERES_ATAQUE, PODERES_ESPECIAIS, PODERES_COM_ALVO };

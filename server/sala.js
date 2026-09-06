const { sortearPergunta, sortearPortas } = require("./perguntas");
const { sortearConjuntoAssociacao, embaralharParaJogador: embaralharAssociacaoParaJogador } = require("./associacoes");
const { sortearConjuntoClassificacao, embaralharParaJogador: embaralharClassificacaoParaJogador } = require("./classificacoes");

// Jogos de Poder implementados nesta etapa. Festa de Pontos e Aposta ficaram
// de fora de propósito: o efeito exato deles não está documentado em
// nenhuma fonte pública que encontramos, então preferi não inventar uma
// regra e ter que desfazer depois.
const TIPOS_DE_PODER = ["congelamento", "gosma", "bombolha", "mordicadores"];

// Valores usados numa partida de verdade. Testes automatizados passam um
// objeto de opções menor pro construtor, pra não precisar esperar segundos
// reais de leitura/timeout a cada asserção.
const PADROES = {
  maxJogadores: 6,
  totalRodadas: 3,
  perguntasPorRodada: 3,

  tempoLimitePortaMs: 10000,
  tempoEscolhaPoderMs: 10000, // tempo pra escolher qual poder usar (ou nenhum)
  tempoEscolhaAlvoMs: 20000, // tempo pra escolher em quem usar o poder escolhido
  tempoLeituraMs: 8000, // tempo pra ler a pergunta antes de poder responder
  tempoLimitePerguntaMs: 15000, // tempo de resposta, contado a partir do fim da leitura
  pontosBaseAcerto: 100,
  bonusVelocidadeMax: 100,

  tempoLimiteLinkingMs: 30000,
  pontosPorParLinking: 40,
  bonusVelocidadeLinkingMax: 100, // só pra quem completa todos os pares

  tempoLimiteSortingMs: 30000,
  pontosPorItemSorting: 25, // sem bônus de velocidade, igual ao jogo original

  piramideDegraus: 10, // quantos acertos seguidos (a partir da própria largada) pra vencer

  pausaAposPortaMs: 2500, // tempo pra ler "o tema escolhido foi..."
  timeoutSegurancaProximaMs: 20000, // se alguém travar/desconectar sem confirmar (a detecção de zumbi já cobre o caso comum antes disso)
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
    this.jogadores = new Map(); // id -> { nome, pontos, ehAnfitriao, ws }
    // lobby | escolha_porta | escolha_poder | escolha_alvo | leitura | pergunta
    // | revelacao | linking | revelacao_linking | sorting | revelacao_sorting
    // | piramide | revelacao_piramide | fim
    this.estado = "lobby";
    this.tvWs = null;
    this._proximoIdJogador = 1;

    // progressão da partida
    this.rodadaAtual = 0;
    this.perguntaNaRodada = 0;
    this.categoriaRodadaAtual = null;
    this.idsPerguntasUsadas = [];

    // fase de escolha de porta
    this.portasAtuais = [];
    this.escolhasPorta = new Map(); // jogadorId -> indice da porta
    this._timeoutPorta = null;

    // fase de pergunta
    this.perguntaAtual = null; // { ...pergunta, indiceCorreto, iniciadaEm, respostas }
    this._timeoutLeitura = null;
    this._timeoutPergunta = null;

    // Jogos de Poder da pergunta atual - agora em duas escolhas sequenciais:
    // primeiro qual poder usar, depois em quem usar.
    this.poderesEscolhidos = new Map(); // jogadorId -> tipo escolhido (só de quem escolheu)
    this.alvosEscolhidos = new Set(); // jogadorId que já resolveu a fase de alvo (escolheu ou não tinha poder)
    this.efeitosAtivos = new Map(); // jogadorId (alvo) -> [{ tipo, deId, deNome }]
    this._timeoutEscolhaPoder = null;
    this._timeoutEscolhaAlvo = null;

    // fase de Linking (desafio de associação)
    this.linkingAtual = null;
    this._timeoutLinking = null;

    // fase de Sorting (desafio de classificação)
    this.sortingAtual = null;
    this._timeoutSorting = null;

    // fase da Pirâmide do Conhecimento (finale) - corrida individual, cada
    // jogador tem sua própria pergunta e avança no próprio ritmo.
    this.piramideAtual = null;

    // fase de revelação (todos precisam confirmar pra avançar) - genérica,
    // serve tanto pra pergunta simples quanto pra Linking e Sorting.
    this._faseRevelacaoAtual = null; // "pergunta" | "linking" | "sorting"
    this._aguardandoConfirmacao = false;
    this.confirmacoesProximo = new Set();
    this._timeoutProximo = null;
  }

  // ---------- gestão de conexões ----------

  registrarTv(ws) {
    this.tvWs = ws;
    this._enviar(ws, "estadoSala", this._resumoParaTv());
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
    this.jogadores.set(id, { id, nome, pontos: 0, ehAnfitriao, ws });

    this._enviar(ws, "entrouComSucesso", {
      jogadorId: id,
      ehAnfitriao,
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

  removerJogadorPorWs(ws) {
    for (const [id, jogador] of this.jogadores) {
      if (jogador.ws === ws) {
        const eraAnfitriao = jogador.ehAnfitriao;
        this.jogadores.delete(id);
        if (eraAnfitriao && this.jogadores.size > 0) {
          const proximo = this.jogadores.values().next().value;
          proximo.ehAnfitriao = true;
        }
        this._transmitirParaTodos("jogadoresAtualizados", {
          jogadores: this._listaJogadoresPublica(),
        });
        this._enviarParaTv("jogadoresAtualizados", {
          jogadores: this._listaJogadoresPublica(),
        });

        // se o jogador que saiu era o único que faltava confirmar/escolher/
        // terminar, o jogo não deve ficar esperando por ele pra sempre.
        if (
          this.jogadores.size > 0 &&
          this._aguardandoConfirmacao &&
          this.confirmacoesProximo.size >= this.jogadores.size
        ) {
          clearTimeout(this._timeoutProximo);
          this._aguardandoConfirmacao = false;
          this._avancarAposResultado();
        } else if (
          this.jogadores.size > 0 &&
          this.estado === "escolha_porta" &&
          this.escolhasPorta.size >= this.jogadores.size
        ) {
          clearTimeout(this._timeoutPorta);
          this._resolverPorta();
        } else if (
          this.jogadores.size > 0 &&
          this.estado === "escolha_poder" &&
          this.poderesEscolhidos.size >= this.jogadores.size
        ) {
          clearTimeout(this._timeoutEscolhaPoder);
          this._resolverEscolhaPoder();
        } else if (
          this.jogadores.size > 0 &&
          this.estado === "escolha_alvo" &&
          this.alvosEscolhidos.size >= this.jogadores.size
        ) {
          clearTimeout(this._timeoutEscolhaAlvo);
          this._resolverEscolhaAlvo();
        } else if (
          this.jogadores.size > 0 &&
          this.estado === "pergunta" &&
          this.perguntaAtual &&
          this.perguntaAtual.respostas.size >= this.jogadores.size
        ) {
          clearTimeout(this._timeoutPergunta);
          this._revelarResultado();
        } else if (
          this.jogadores.size > 0 &&
          this.estado === "linking" &&
          this.linkingAtual &&
          [...this.linkingAtual.progresso.values()].every((p) => p.completoEmMs !== null)
        ) {
          clearTimeout(this._timeoutLinking);
          this._revelarLinking();
        } else if (
          this.jogadores.size > 0 &&
          this.estado === "sorting" &&
          this.sortingAtual &&
          [...this.sortingAtual.progresso.values()].every(
            (p) => p.respondidos.size >= p.itens.length
          )
        ) {
          clearTimeout(this._timeoutSorting);
          this._revelarSorting();
        }
        return;
      }
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
    this.rodadaAtual = 1;
    this._iniciarEscolhaPorta();
    return { ok: true };
  }

  registrarEscolhaPorta(jogadorId, indice) {
    if (this.estado !== "escolha_porta") {
      return { erro: "Não há escolha de porta em aberto no momento." };
    }
    if (indice < 0 || indice >= this.portasAtuais.length) {
      return { erro: "Porta inválida." };
    }
    this.escolhasPorta.set(jogadorId, indice);

    this._enviarParaTv("progressoPortas", {
      contagens: this._contarVotosPorta(),
    });

    if (this.escolhasPorta.size >= this.jogadores.size) {
      clearTimeout(this._timeoutPorta);
      this._resolverPorta();
    }

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
    });

    if (this.perguntaAtual.respostas.size >= this.jogadores.size) {
      clearTimeout(this._timeoutPergunta);
      this._revelarResultado();
    }

    return { ok: true };
  }

  registrarEscolhaPoder(jogadorId, tipo) {
    if (this.estado !== "escolha_poder") {
      return { erro: "Não há escolha de poder em aberto no momento." };
    }
    if (!TIPOS_DE_PODER.includes(tipo)) {
      return { erro: "Tipo de poder inválido." };
    }
    if (this.poderesEscolhidos.has(jogadorId)) {
      return { erro: "Você já escolheu seu poder nesta pergunta." };
    }

    this.poderesEscolhidos.set(jogadorId, tipo);

    if (this.poderesEscolhidos.size >= this.jogadores.size) {
      clearTimeout(this._timeoutEscolhaPoder);
      this._resolverEscolhaPoder();
    }

    return { ok: true };
  }

  registrarEscolhaAlvoPoder(jogadorId, alvoId) {
    if (this.estado !== "escolha_alvo") {
      return { erro: "Não há escolha de alvo em aberto no momento." };
    }
    if (!this.poderesEscolhidos.has(jogadorId)) {
      return { erro: "Você não escolheu um poder pra usar nesta pergunta." };
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
    const tipo = this.poderesEscolhidos.get(jogadorId);
    this.alvosEscolhidos.add(jogadorId);

    if (!this.efeitosAtivos.has(alvoId)) this.efeitosAtivos.set(alvoId, []);
    this.efeitosAtivos.get(alvoId).push({ tipo, deId: jogadorId, deNome: jogador.nome });

    this._enviar(alvo.ws, "atingidoPorPoder", {
      tipo,
      deNome: jogador.nome,
      efeitosAtivos: this.efeitosAtivos.get(alvoId),
    });
    this._enviarParaTv("usoDePoder", { tipo, deNome: jogador.nome, alvoNome: alvo.nome });

    if (this.alvosEscolhidos.size >= this.jogadores.size) {
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
    this._enviarParaTv("progressoLinking", this._progressoLinkingParaTv());

    const todosCompletos = [...this.linkingAtual.progresso.values()].every(
      (p) => p.completoEmMs !== null
    );
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
    this._enviarParaTv("progressoSorting", this._progressoSortingParaTv());

    const todosCompletos = [...this.sortingAtual.progresso.values()].every(
      (p) => p.respondidos.size >= p.itens.length
    );
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

    progresso.posicao++;
    const progressoParaTodos = this._progressoPiramideParaTodos();
    this._transmitirParaTodos("progressoPiramide", progressoParaTodos);
    this._enviarParaTv("progressoPiramide", progressoParaTodos);

    if (progresso.posicao >= this.cfg.piramideDegraus) {
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

    const progresso = {
      confirmados: this.confirmacoesProximo.size,
      total: this.jogadores.size,
    };
    this._transmitirParaTodos("progressoContinuar", progresso);
    this._enviarParaTv("progressoContinuar", progresso);

    if (this.confirmacoesProximo.size >= this.jogadores.size) {
      clearTimeout(this._timeoutProximo);
      this._aguardandoConfirmacao = false;
      this._avancarAposResultado();
    }

    return { ok: true };
  }

  // ---------- internos: escolha de porta ----------

  _iniciarEscolhaPorta() {
    this.estado = "escolha_porta";
    this.perguntaNaRodada = 0;
    this.categoriaRodadaAtual = null;
    this.portasAtuais = sortearPortas(4);
    this.escolhasPorta = new Map();

    const payload = {
      rodadaAtual: this.rodadaAtual,
      totalRodadas: this.cfg.totalRodadas,
      portas: this.portasAtuais,
      tempoLimiteMs: this.cfg.tempoLimitePortaMs,
    };
    this._transmitirParaTodos("escolhaPorta", payload);
    this._enviarParaTv("escolhaPorta", payload);

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

    const contagens = this._contarVotosPorta();
    const maiorVotos = Math.max(...contagens);
    const vencedoras =
      maiorVotos > 0
        ? contagens.reduce((acc, v, i) => (v === maiorVotos ? [...acc, i] : acc), [])
        : this.portasAtuais.map((_, i) => i); // ninguém escolheu: sorteia entre todas
    const indiceVencedor = vencedoras[Math.floor(Math.random() * vencedoras.length)];

    this.categoriaRodadaAtual = this.portasAtuais[indiceVencedor];

    const payload = { categoria: this.categoriaRodadaAtual, contagens };
    this._transmitirParaTodos("portaEscolhida", payload);
    this._enviarParaTv("portaEscolhida", payload);

    setTimeout(() => this._iniciarEscolhaPoder(), this.cfg.pausaAposPortaMs);
  }

  // ---------- internos: Jogos de Poder (escolha em duas etapas) ----------

  _iniciarEscolhaPoder() {
    this.estado = "escolha_poder";
    this.poderesEscolhidos = new Map();
    this.alvosEscolhidos = new Set();
    this.efeitosAtivos = new Map();

    const payload = {
      rodadaAtual: this.rodadaAtual,
      totalRodadas: this.cfg.totalRodadas,
      perguntaNaRodada: this.perguntaNaRodada + 1,
      totalPerguntasPorRodada: this.cfg.perguntasPorRodada,
      tiposDisponiveis: TIPOS_DE_PODER,
      tempoLimiteMs: this.cfg.tempoEscolhaPoderMs,
    };
    this._transmitirParaTodos("escolhaPoder", payload);
    this._enviarParaTv("escolhaPoder", payload);

    this._timeoutEscolhaPoder = setTimeout(() => {
      if (this.estado === "escolha_poder") this._resolverEscolhaPoder();
    }, this.cfg.tempoEscolhaPoderMs + 500);
  }

  _resolverEscolhaPoder() {
    if (this.estado !== "escolha_poder") return;
    this._iniciarEscolhaAlvo();
  }

  _iniciarEscolhaAlvo() {
    this.estado = "escolha_alvo";
    this.alvosEscolhidos = new Set();

    for (const [id, jogador] of this.jogadores) {
      const tipo = this.poderesEscolhidos.get(id);
      if (tipo) {
        this._enviar(jogador.ws, "escolhaAlvo", {
          temPoder: true,
          tipo,
          alvosPossiveis: [...this.jogadores.values()]
            .filter((j) => j.id !== id)
            .map((j) => ({ id: j.id, nome: j.nome })),
          tempoLimiteMs: this.cfg.tempoEscolhaAlvoMs,
        });
      } else {
        this._enviar(jogador.ws, "escolhaAlvo", {
          temPoder: false,
          tempoLimiteMs: this.cfg.tempoEscolhaAlvoMs,
        });
        this.alvosEscolhidos.add(id); // não escolheu poder, não há o que resolver
      }
    }
    this._enviarParaTv("escolhaAlvo", { tempoLimiteMs: this.cfg.tempoEscolhaAlvoMs });

    this._timeoutEscolhaAlvo = setTimeout(() => {
      if (this.estado === "escolha_alvo") this._resolverEscolhaAlvo();
    }, this.cfg.tempoEscolhaAlvoMs + 500);

    // se ninguém escolheu poder algum, não há por que esperar
    if (this.alvosEscolhidos.size >= this.jogadores.size) {
      clearTimeout(this._timeoutEscolhaAlvo);
      this._resolverEscolhaAlvo();
    }
  }

  _resolverEscolhaAlvo() {
    if (this.estado !== "escolha_alvo") return;
    this._proximaPerguntaDaRodada();
  }

  // ---------- internos: perguntas ----------

  _proximaPerguntaDaRodada() {
    this.perguntaNaRodada++;
    const sorteada = sortearPergunta(this.categoriaRodadaAtual, this.idsPerguntasUsadas);
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
      alternativas: sorteada.alternativas,
      tempoLeituraMs: this.cfg.tempoLeituraMs,
      tempoLimiteMs: this.cfg.tempoLimitePerguntaMs,
    };
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

    const { indiceCorreto, respostas } = this.perguntaAtual;

    for (const [id, jogador] of this.jogadores) {
      const resposta = respostas.get(id);
      const acertou = !!resposta && resposta.alternativaIndex === indiceCorreto;
      let pontosGanhos = 0;

      if (acertou) {
        const fracaoRestante = Math.max(
          0,
          1 - resposta.tempoMs / this.cfg.tempoLimitePerguntaMs
        );
        pontosGanhos =
          this.cfg.pontosBaseAcerto + Math.round(this.cfg.bonusVelocidadeMax * fracaoRestante);
        jogador.pontos += pontosGanhos;
      }

      this._enviar(jogador.ws, "resultadoPergunta", {
        respostaCorretaIndex: indiceCorreto,
        seuResultado: { acertou, pontosGanhos, respondeu: !!resposta },
        placar: this._placar(),
      });
    }

    this._enviarParaTv("resultadoPergunta", {
      respostaCorretaIndex: indiceCorreto,
      placar: this._placar(),
    });

    this._faseRevelacaoAtual = "pergunta";
    this._iniciarEsperaConfirmacao();
  }

  // ---------- internos: Linking (desafio de associação) ----------

  _iniciarLinking() {
    const conjunto = sortearConjuntoAssociacao();
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

    const totalPares = this.linkingAtual.pares.length;

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

      this._enviar(jogador.ws, "resultadoLinking", {
        pontosGanhos,
        paresCorretos: p.corretos.size,
        totalPares,
        pares: this.linkingAtual.pares,
        placar: this._placar(),
      });
    }

    this._enviarParaTv("resultadoLinking", {
      pares: this.linkingAtual.pares,
      placar: this._placar(),
    });

    this._faseRevelacaoAtual = "linking";
    this._iniciarEsperaConfirmacao();
  }

  // ---------- internos: Sorting (desafio de classificação) ----------

  _iniciarSorting() {
    const conjunto = sortearConjuntoClassificacao();
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

    const totalItens = this.sortingAtual.itensOriginais.length;
    const gabaritoCompleto = this.sortingAtual.itensOriginais.map((it) => ({
      nome: it.nome,
      categoria: it.categoria,
    }));

    for (const [id, jogador] of this.jogadores) {
      const p = this.sortingAtual.progresso.get(id);
      let corretos = 0;
      for (const [itemIndex, categoria] of p.respondidos) {
        if (p.gabarito[itemIndex] === categoria) corretos++;
      }
      const pontosGanhos = corretos * this.cfg.pontosPorItemSorting;
      jogador.pontos += pontosGanhos;

      this._enviar(jogador.ws, "resultadoSorting", {
        pontosGanhos,
        corretos,
        totalItens,
        gabarito: gabaritoCompleto,
        placar: this._placar(),
      });
    }

    this._enviarParaTv("resultadoSorting", {
      gabarito: gabaritoCompleto,
      placar: this._placar(),
    });

    this._faseRevelacaoAtual = "sorting";
    this._iniciarEsperaConfirmacao();
  }

  // ---------- internos: Pirâmide do Conhecimento (finale) ----------

  _iniciarPiramide() {
    this.estado = "piramide";

    // a pontuação acumulada até aqui só decide a largada - a partir daqui
    // quem chega primeiro no topo é quem vence a partida de verdade.
    const placarAntesDaPiramide = this._placar();
    const total = placarAntesDaPiramide.length;
    const alturaMaximaLargada = Math.max(0, this.cfg.piramideDegraus - 2);

    this.piramideAtual = { progresso: new Map() };

    placarAntesDaPiramide.forEach((jogadorPlacar, rank) => {
      const posicaoInicial =
        total > 1 ? Math.round((alturaMaximaLargada * (total - 1 - rank)) / (total - 1)) : 0;
      this.piramideAtual.progresso.set(jogadorPlacar.id, {
        posicao: posicaoInicial,
        perguntaAtual: null,
      });
    });

    const payload = {
      totalDegraus: this.cfg.piramideDegraus,
      jogadores: this._progressoPiramideParaTodos(),
    };
    this._transmitirParaTodos("iniciarPiramide", payload);
    this._enviarParaTv("iniciarPiramide", payload);

    for (const jogadorId of this.piramideAtual.progresso.keys()) {
      this._proximaPerguntaPiramide(jogadorId);
    }
  }

  _proximaPerguntaPiramide(jogadorId) {
    const progresso = this.piramideAtual.progresso.get(jogadorId);
    const sorteada = sortearPergunta(null, this.idsPerguntasUsadas);
    this.idsPerguntasUsadas.push(sorteada.id);

    progresso.perguntaAtual = {
      indiceCorreto: sorteada.indiceCorreto,
      tentativasErradas: new Set(),
    };

    const jogador = this.jogadores.get(jogadorId);
    this._enviar(jogador.ws, "novaPerguntaPiramide", {
      pergunta: sorteada.pergunta,
      categoria: sorteada.categoria,
      alternativas: sorteada.alternativas,
    });
  }

  _progressoPiramideParaTodos() {
    return [...this.jogadores.values()].map((j) => ({
      id: j.id,
      nome: j.nome,
      posicao: this.piramideAtual.progresso.get(j.id)?.posicao ?? 0,
    }));
  }

  _vencerPiramide(vencedorId) {
    this.estado = "revelacao_piramide";
    const vencedor = this.jogadores.get(vencedorId);
    this.piramideAtual.vencedorId = vencedorId;
    this.piramideAtual.vencedorNome = vencedor.nome;

    // ninguém mais precisa continuar respondendo depois que alguém venceu
    for (const progresso of this.piramideAtual.progresso.values()) {
      progresso.perguntaAtual = null;
    }

    const payload = {
      vencedorNome: vencedor.nome,
      posicoesFinais: this._progressoPiramideParaTodos(),
    };
    this._transmitirParaTodos("resultadoPiramide", payload);
    this._enviarParaTv("resultadoPiramide", payload);

    this._faseRevelacaoAtual = "piramide";
    this._iniciarEsperaConfirmacao();
  }

  // ---------- internos: confirmação genérica pra avançar ----------

  _iniciarEsperaConfirmacao() {
    this.confirmacoesProximo = new Set();
    this._aguardandoConfirmacao = true;
    this._timeoutProximo = setTimeout(() => {
      this._aguardandoConfirmacao = false;
      this._avancarAposResultado();
    }, this.cfg.timeoutSegurancaProximaMs);
  }

  _avancarAposResultado() {
    if (this._faseRevelacaoAtual === "pergunta") {
      if (this.perguntaNaRodada < this.cfg.perguntasPorRodada) {
        this._iniciarEscolhaPoder();
        return;
      }
      if (this.rodadaAtual < this.cfg.totalRodadas) {
        this.rodadaAtual++;
        this._iniciarEscolhaPorta();
        return;
      }
      this._iniciarLinking();
      return;
    }
    if (this._faseRevelacaoAtual === "linking") {
      this._iniciarSorting();
      return;
    }
    if (this._faseRevelacaoAtual === "sorting") {
      this._iniciarPiramide();
      return;
    }
    // depois da Pirâmide, a partida termina de vez.
    this._finalizarPartida();
  }

  _finalizarPartida() {
    this.estado = "fim";
    const payload = {
      placarFinal: this._placar(),
      vencedorNome: this.piramideAtual?.vencedorNome ?? null,
    };
    this._transmitirParaTodos("fimDePartida", payload);
    this._enviarParaTv("fimDePartida", payload);
  }

  // ---------- utilitários ----------

  _placar() {
    return [...this.jogadores.values()]
      .map((j) => ({ id: j.id, nome: j.nome, pontos: j.pontos }))
      .sort((a, b) => b.pontos - a.pontos);
  }

  _listaJogadoresPublica() {
    return [...this.jogadores.values()].map((j) => ({
      id: j.id,
      nome: j.nome,
      ehAnfitriao: j.ehAnfitriao,
      pontos: j.pontos,
    }));
  }

  _resumoParaTv() {
    return {
      codigo: this.codigo,
      estado: this.estado,
      jogadores: this._listaJogadoresPublica(),
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

module.exports = { Sala, PADROES, TIPOS_DE_PODER };

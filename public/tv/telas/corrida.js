// A corrida da Pirâmide na TV. Cada acerto que o servidor avisa vira um pulo
// daquele bicho para o andar de cima. Referência: teste/teste-piramide-final.html.
window.TelaCorrida = (() => {
  const DURACAO_PULO = 450;

  let piramide = null;
  const filas = new Map(); // jogadorId -> promessa do último pulo (não atropela)
  const nomes = new Map();
  let totalAndares = 8;

  function status(texto, vitoria = false) {
    const e = document.getElementById("cr-status");
    e.textContent = texto;
    e.classList.toggle("vitoria", vitoria);
  }

  function nomeAndar(n) {
    return n <= 0 ? "o chão" : n >= totalAndares ? "o topo" : `o andar ${n}`;
  }

  // payload: iniciarPiramide { totalAndares, jogadores: [{ id, nome, avatar, posicao }] }
  function montar(payload, ordemDeEntrada) {
    parar();
    totalAndares = payload.totalAndares;
    const tela = document.getElementById("tela-piramide");
    const area = document.getElementById("cr-area");
    piramide = Piramide3D.criar({ raiz: tela, area, totalAndares });
    piramide.desenhar();

    const faixas = Piramide3D.distribuirFaixas(
      ordemDeEntrada.filter((j) => payload.jogadores.some((p) => p.id === j.id))
    );
    for (const j of payload.jogadores) {
      nomes.set(j.id, j.nome);
      const s = piramide.adicionar(j, faixas.get(j.id) || { lado: "esquerda", faixa: 0.5 }, j.posicao);
      s.animal.classList.add("visivel");
    }
    marcarConexao(payload.jogadores);
    status("🏁 Valendo! Cada acerto sobe um andar");
  }

  // quem caiu fica apagado na pirâmide até voltar
  function marcarConexao(jogadores) {
    if (!piramide) return;
    for (const j of jogadores) {
      const s = piramide.animais.get(j.id);
      if (s) s.animal.classList.toggle("desconectado", j.conectado === false);
    }
  }

  // progressoPiramide { jogadores, subiuId }: anima quem subiu, um andar por vez
  function atualizar(payload) {
    if (!piramide) return;
    marcarConexao(payload.jogadores);
    for (const j of payload.jogadores) {
      const s = piramide.animais.get(j.id);
      if (!s) continue;
      const destino = j.posicao;
      const anterior = filas.get(j.id) || Promise.resolve();
      const proxima = anterior.then(async () => {
        // a mensagem pode chegar atrasada ou pulada: sobe o que faltar
        while (s.nivel < destino) {
          const alvo = s.nivel + 1;
          s.animal.classList.add("ativo");
          const ok = await piramide.animarSubida(s, alvo, DURACAO_PULO);
          s.animal.classList.remove("ativo");
          if (!ok) return;
          piramide.pulsarRotulo(alvo);
        }
      });
      filas.set(j.id, proxima);
    }
    if (payload.subiuId) {
      const j = payload.jogadores.find((x) => x.id === payload.subiuId);
      if (j) status(`${j.avatar ? j.avatar.emoji + " " : ""}${j.nome} subiu para ${nomeAndar(j.posicao)}!`);
    }
  }

  // vencedorPiramide: o bicho chega ao topo e ganha o troféu
  function vencedor(payload) {
    if (!piramide) return;
    atualizar({ jogadores: payload.jogadores });
    const s = piramide.animais.get(payload.vencedorId);
    const fila = (s && filas.get(payload.vencedorId)) || Promise.resolve();
    fila.then(() => {
      if (s) s.animal.classList.add("venceu");
      status(`🏆 ${payload.vencedorNome} chegou ao topo e venceu a partida!`, true);
    });
  }

  function redimensionar() {
    if (piramide) piramide.redimensionar();
  }

  function parar() {
    if (piramide) piramide.destruir();
    piramide = null;
    filas.clear();
    nomes.clear();
  }

  return { montar, atualizar, vencedor, marcarConexao, redimensionar, parar };
})();

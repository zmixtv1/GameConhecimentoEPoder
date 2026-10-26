// Reenvia a tela da fase atual pra quem acabou de (re)conectar: um celular que
// caiu e voltou, ou a TV que recarregou. Usa as mesmas mensagens que o jogo
// manda normalmente, só que com o tempo que ainda falta (e, no celular, o que
// o jogador já fez nessa fase), então os clientes não precisam de código novo
// pra "retomar" - eles só reagem à mensagem como se a fase tivesse acabado
// de começar.

function restante(sala, duracaoMs, inicio = sala._inicioFase) {
  if (!inicio) return duracaoMs;
  return Math.max(0, duracaoMs - (Date.now() - inicio));
}

function resultadoDoJogador(sala, jogadorId) {
  return sala._resultadoAtual.porJogador.get(jogadorId) || sala._resultadoAtual.comum;
}

// ---------- celular ----------

function enviarEstadoAoJogador(sala, jogador) {
  const { id, ws } = jogador;
  const cfg = sala.cfg;
  const enviar = (tipo, dados) => sala._enviar(ws, tipo, dados);

  switch (sala.estado) {
    case "escolha_porta": {
      enviar("escolhaPorta", {
        ...sala._payloadPortaBase,
        tempoLimiteMs: restante(sala, cfg.tempoLimitePortaMs),
        poderPortaDisponivel: !sala.jogadoresQueUsaramPoderPorta.has(id),
        // depois que a porta é sorteada (pausa antes do poder) ninguém mais escolhe
        jaEscolheu: sala.escolhasPorta.has(id) || sala.categoriaRodadaAtual !== null,
      });
      break;
    }

    case "escolha_poder": {
      // a oferta é a mesma que ele já tinha recebido: o 4º poder não muda
      enviar("escolhaPoder", {
        ...sala._payloadEscolhaPoder,
        oferta: sala.ofertasPoder.get(id) || [],
        tempoLimiteMs: restante(sala, cfg.tempoEscolhaPoderMs),
        jaEscolheu: sala.poderesEscolhidos.has(id),
      });
      break;
    }

    case "escolha_alvo": {
      const tempoLimiteMs = restante(sala, cfg.tempoEscolhaAlvoMs);
      const payload = sala._payloadEscolhaAlvo(id, tempoLimiteMs);
      // já escolheu o alvo antes de cair: só espera
      if (payload.precisaAlvo && sala.alvosEscolhidos.has(id)) {
        enviar("escolhaAlvo", { temPoder: true, precisaAlvo: false, tipo: payload.tipo, jaUsou: true, tempoLimiteMs });
      } else {
        enviar("escolhaAlvo", payload);
      }
      break;
    }

    case "animacao_poderes": {
      enviar("olheParaTv", { duracaoMs: restante(sala, sala._payloadAnimacao.duracaoMs) });
      break;
    }

    case "leitura": {
      enviar("novaPergunta", {
        ...sala._payloadNovaPergunta,
        tempoLeituraMs: restante(sala, cfg.tempoLeituraMs),
      });
      break;
    }

    case "pergunta": {
      enviar("novaPergunta", { ...sala._payloadNovaPergunta, tempoLeituraMs: 0 });
      const resposta = sala.perguntaAtual.respostas.get(id);
      enviar("iniciarResposta", {
        tempoLimiteMs: restante(sala, cfg.tempoLimitePerguntaMs, sala.perguntaAtual.iniciadaEm),
        efeitosAtivos: sala.efeitosAtivos.get(id) || [],
        escudo: sala._resumoEscudo(id),
        bonusVelocidadeMax: cfg.bonusVelocidadeMax,
        tempoTotalMs: cfg.tempoLimitePerguntaMs, // o bônus conta do tempo inteiro, não do que sobrou
        respostaDada: resposta ? resposta.alternativaIndex : null,
      });
      break;
    }

    case "revelacao":
    case "revelacao_linking":
    case "revelacao_sorting": {
      const resultado = resultadoDoJogador(sala, id);
      if (resultado) {
        enviar(resultado.type, { ...resultado.payload, jaConfirmou: sala.confirmacoesProximo.has(id) });
      }
      break;
    }

    case "linking": {
      const p = sala.linkingAtual.progresso.get(id);
      enviar("iniciarLinking", {
        tema: sala.linkingAtual.tema,
        esquerda: sala.linkingAtual.pares.map((par) => par.esquerda),
        direita: p.direita,
        tempoLimiteMs: restante(sala, cfg.tempoLimiteLinkingMs, sala.linkingAtual.iniciadaEm),
        corretos: [...p.corretos],
        direitaUsada: [...p.direitaUsada],
        completou: p.completoEmMs !== null,
      });
      break;
    }

    case "sorting": {
      const p = sala.sortingAtual.progresso.get(id);
      enviar("iniciarSorting", {
        categoriaA: sala.sortingAtual.categoriaA,
        categoriaB: sala.sortingAtual.categoriaB,
        itens: p.itens,
        tempoLimiteMs: restante(sala, cfg.tempoLimiteSortingMs, sala.sortingAtual.iniciadaEm),
        respondidos: [...p.respondidos].map(([itemIndex, categoria]) => ({
          itemIndex,
          categoria,
          correto: p.gabarito[itemIndex] === categoria,
        })),
      });
      break;
    }

    case "largada_piramide": {
      enviar("largadaPiramide", {
        ...sala._payloadLargada,
        duracaoMs: restante(sala, sala._payloadLargada.duracaoMs),
      });
      break;
    }

    case "piramide": {
      enviar("iniciarPiramide", {
        totalAndares: cfg.piramideAndares,
        jogadores: sala._progressoPiramideParaTodos(),
      });
      const p = sala.piramideAtual.progresso.get(id);
      if (p && p.perguntaAtual) {
        enviar("novaPerguntaPiramide", {
          pergunta: p.perguntaAtual.pergunta,
          categoria: p.perguntaAtual.categoria,
          alternativas: p.perguntaAtual.alternativas,
        });
        for (const alternativaIndex of p.perguntaAtual.tentativasErradas) {
          enviar("respostaErradaPiramide", { alternativaIndex });
        }
      }
      break;
    }

    case "vitoria_piramide": {
      enviar("vencedorPiramide", {
        vencedorId: sala.piramideAtual.vencedorId,
        vencedorNome: sala.piramideAtual.vencedorNome,
        jogadores: sala._progressoPiramideParaTodos(),
      });
      break;
    }

    case "fim": {
      enviar("fimDePartida", sala._payloadFim);
      break;
    }

    default:
      break; // lobby: quem volta no lobby cai na tela de escolha de animal/espera
  }
}

// ---------- TV ----------

function enviarEstadoATv(sala) {
  const cfg = sala.cfg;
  const enviar = (tipo, dados) => sala._enviarParaTv(tipo, dados);

  switch (sala.estado) {
    case "escolha_porta": {
      if (sala.categoriaRodadaAtual !== null && sala._payloadPortaEscolhida) {
        enviar("escolhaPorta", { ...sala._payloadPortaBase, tempoLimiteMs: 0 });
        enviar("portaEscolhida", sala._payloadPortaEscolhida);
      } else {
        enviar("escolhaPorta", {
          ...sala._payloadPortaBase,
          tempoLimiteMs: restante(sala, cfg.tempoLimitePortaMs),
        });
        enviar("progressoPortas", { contagens: sala._contarVotosPorta() });
      }
      break;
    }

    case "escolha_poder": {
      enviar("escolhaPoder", {
        ...sala._payloadEscolhaPoder,
        tempoLimiteMs: restante(sala, cfg.tempoEscolhaPoderMs),
      });
      break;
    }

    case "escolha_alvo": {
      enviar("escolhaAlvo", { tempoLimiteMs: restante(sala, cfg.tempoEscolhaAlvoMs) });
      break;
    }

    case "animacao_poderes": {
      // recomeça a sequência do início: é curta, e a próxima pergunta já vem
      // assim que o tempo dela acabar no servidor
      enviar("animacaoPoderes", sala._payloadAnimacao);
      break;
    }

    case "leitura": {
      enviar("novaPergunta", {
        ...sala._payloadNovaPergunta,
        tempoLeituraMs: restante(sala, cfg.tempoLeituraMs),
      });
      break;
    }

    case "pergunta": {
      enviar("novaPergunta", { ...sala._payloadNovaPergunta, tempoLeituraMs: 0 });
      enviar("iniciarResposta", {
        tempoLimiteMs: restante(sala, cfg.tempoLimitePerguntaMs, sala.perguntaAtual.iniciadaEm),
      });
      enviar("progressoRespostas", {
        respondidos: sala.perguntaAtual.respostas.size,
        total: sala.jogadores.size,
        jogadoresQueResponderam: [...sala.perguntaAtual.respostas.keys()],
      });
      break;
    }

    case "revelacao":
    case "revelacao_linking":
    case "revelacao_sorting": {
      const resultado = sala._resultadoAtual.tv || sala._resultadoAtual.comum;
      if (resultado) {
        enviar(resultado.type, resultado.payload);
        enviar("progressoContinuar", sala._progressoConfirmacao());
      }
      break;
    }

    case "linking": {
      enviar("iniciarLinking", {
        tema: sala.linkingAtual.tema,
        tempoLimiteMs: restante(sala, cfg.tempoLimiteLinkingMs, sala.linkingAtual.iniciadaEm),
      });
      enviar("progressoLinking", { jogadores: sala._progressoLinkingParaTv() });
      break;
    }

    case "sorting": {
      enviar("iniciarSorting", {
        categoriaA: sala.sortingAtual.categoriaA,
        categoriaB: sala.sortingAtual.categoriaB,
        tempoLimiteMs: restante(sala, cfg.tempoLimiteSortingMs, sala.sortingAtual.iniciadaEm),
      });
      enviar("progressoSorting", { jogadores: sala._progressoSortingParaTv() });
      break;
    }

    case "largada_piramide": {
      enviar("largadaPiramide", sala._payloadLargada);
      break;
    }

    case "piramide": {
      enviar("iniciarPiramide", {
        totalAndares: cfg.piramideAndares,
        jogadores: sala._progressoPiramideParaTodos(),
      });
      break;
    }

    case "vitoria_piramide": {
      enviar("iniciarPiramide", {
        totalAndares: cfg.piramideAndares,
        jogadores: sala._progressoPiramideParaTodos(),
      });
      enviar("vencedorPiramide", {
        vencedorId: sala.piramideAtual.vencedorId,
        vencedorNome: sala.piramideAtual.vencedorNome,
        jogadores: sala._progressoPiramideParaTodos(),
      });
      break;
    }

    case "fim": {
      enviar("fimDePartida", sala._payloadFim);
      break;
    }

    default:
      break;
  }
}

module.exports = { enviarEstadoAoJogador, enviarEstadoATv };

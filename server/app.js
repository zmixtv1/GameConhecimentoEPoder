const http = require("http");
const path = require("path");
const express = require("express");
const { WebSocketServer } = require("ws");
const { Sala } = require("./sala");

// Monta o servidor (HTTP + WebSocket + a Sala) sem escutar em nenhuma porta.
// Separado do index.js pra poder ser usado tanto em produção quanto nos
// testes automatizados (que sobem uma instância isolada em porta aleatória).
function criarServidor(opcoesSala = {}) {
  const app = express();
  app.use(express.static(path.join(__dirname, "..", "public")));

  const servidorHttp = http.createServer(app);
  const wss = new WebSocketServer({ server: servidorHttp });

  const sala = new Sala(opcoesSala);

  // Detecta conexões "zumbis": um celular que perde o Wi-Fi sem fechar o
  // WebSocket direito (tela apagou, saiu do alcance do roteador) continua
  // registrado como conectado pro servidor. Sem isso, o jogo fica esperando
  // pra sempre a resposta/confirmação de alguém que já sumiu - foi o que
  // travou a tela de resultado do Linking na partida em rede.
  function marcarConexaoViva() {
    this.vivo = true;
  }

  const intervaloPing = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.vivo === false) {
        ws.terminate(); // dispara o "close" abaixo, que já limpa o jogador/TV
        continue;
      }
      ws.vivo = false;
      ws.ping();
    }
  }, 10000);

  // wss só emite "close" se alguém chamar wss.close() explicitamente - o
  // servidor (em produção e nos testes) só fecha o servidorHttp, então é
  // nesse evento que precisamos limpar o intervalo, senão ele nunca para.
  servidorHttp.on("close", () => clearInterval(intervaloPing));

  wss.on("connection", (ws) => {
    ws.vivo = true;
    ws.on("pong", marcarConexaoViva);

    ws.on("message", (bruto) => {
      let mensagem;
      try {
        mensagem = JSON.parse(bruto.toString());
      } catch {
        return; // mensagem malformada, ignora
      }

      switch (mensagem.type) {
        case "identificarTv": {
          sala.registrarTv(ws);
          break;
        }

        case "entrar": {
          const nome = String(mensagem.nome || "").trim().slice(0, 20);
          if (!nome) {
            ws.send(JSON.stringify({ type: "erroEntrada", mensagem: "Digite um nome." }));
            break;
          }
          const resultado = sala.adicionarJogador(nome, mensagem.codigoSala, ws);
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroEntrada", mensagem: resultado.erro }));
          } else {
            ws.jogadorId = resultado.jogadorId;
          }
          break;
        }

        case "iniciarPartida": {
          const resultado = sala.iniciarPartida(ws.jogadorId);
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        case "escolherPorta": {
          const resultado = sala.registrarEscolhaPorta(ws.jogadorId, mensagem.indice);
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        case "escolherPoder": {
          const resultado = sala.registrarEscolhaPoder(ws.jogadorId, mensagem.tipo);
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        case "escolherAlvoPoder": {
          const resultado = sala.registrarEscolhaAlvoPoder(ws.jogadorId, mensagem.alvoId);
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        case "responder": {
          const resultado = sala.registrarResposta(ws.jogadorId, mensagem.alternativaIndex);
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        case "tentarPar": {
          const resultado = sala.registrarTentativaPar(
            ws.jogadorId,
            mensagem.esquerdaIndex,
            mensagem.direitaIndex
          );
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        case "classificarItem": {
          const resultado = sala.registrarClassificacaoItem(
            ws.jogadorId,
            mensagem.itemIndex,
            mensagem.categoria
          );
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        case "responderPiramide": {
          const resultado = sala.registrarRespostaPiramide(ws.jogadorId, mensagem.alternativaIndex);
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        case "continuar": {
          const resultado = sala.registrarContinuar(ws.jogadorId);
          if (resultado.erro) {
            ws.send(JSON.stringify({ type: "erroAcao", mensagem: resultado.erro }));
          }
          break;
        }

        default:
          break;
      }
    });

    ws.on("close", () => {
      if (sala.tvWs === ws) sala.tvWs = null;
      sala.removerJogadorPorWs(ws);
    });
  });

  return { app, servidorHttp, sala, wss };
}

module.exports = { criarServidor };

const os = require("os");
const dgram = require("dgram");
const { criarServidor } = require("./app");

const PORTA = process.env.PORTA || 3000;

const { servidorHttp, sala } = criarServidor();
console.log(`Sala criada com o código: ${sala.codigo}`);

// Descobre o IP da interface que a máquina usa para sair para a rede - é
// nela que os celulares do mesmo Wi-Fi (ou do mesmo roteador) conseguem
// chegar. Com cabo e Wi-Fi ligados juntos, pegar o primeiro IPv4 da lista
// podia anunciar no QR code a interface errada.
//
// O truque: "conectar" um socket UDP a um endereço externo não manda pacote
// nenhum, mas faz o sistema escolher a interface pela rota padrão, e aí
// basta perguntar ao socket qual endereço ele ganhou. Funciona sem internet,
// desde que exista roteador.
function ipPelaRotaPadrao() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const desistir = () => {
      try { socket.close(); } catch { /* já fechado */ }
      resolve(null);
    };
    socket.on("error", desistir);
    try {
      socket.connect(53, "8.8.8.8", () => {
        try {
          const { address } = socket.address();
          socket.close();
          resolve(address && address !== "0.0.0.0" ? address : null);
        } catch {
          desistir();
        }
      });
    } catch {
      desistir();
    }
  });
}

// Sem rota padrão (rede sem roteador), fica com o primeiro IPv4 de verdade.
function primeiroIpLocal() {
  const interfaces = os.networkInterfaces();
  for (const nome of Object.keys(interfaces)) {
    for (const iface of interfaces[nome] || []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}

async function obterIpLocal() {
  return (await ipPelaRotaPadrao()) || primeiroIpLocal();
}

servidorHttp.listen(PORTA, async () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
  console.log(`TV:         http://localhost:${PORTA}/tv`);
  console.log(`Controle:   http://localhost:${PORTA}/controlador`);

  const ipLocal = await obterIpLocal();
  if (ipLocal) {
    const linkControlador = `http://${ipLocal}:${PORTA}/controlador?codigo=${sala.codigo}`;
    console.log(`Na rede:    ${linkControlador}`);
    sala.definirLinkControlador(linkControlador);
  } else {
    console.log("Não achei um IP de rede local - o QR code na TV não vai aparecer.");
  }
});

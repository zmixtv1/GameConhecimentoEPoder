const os = require("os");
const { criarServidor } = require("./app");

const PORTA = process.env.PORTA || 3000;

const { servidorHttp, sala } = criarServidor();
console.log(`Sala criada com o código: ${sala.codigo}`);

// pega o primeiro IPv4 "de verdade" da máquina na rede local, pra montar
// um link que outros aparelhos (celulares) consigam abrir - localhost só
// funciona pra quem está testando na mesma máquina do servidor.
function obterIpLocal() {
  const interfaces = os.networkInterfaces();
  for (const nome of Object.keys(interfaces)) {
    for (const iface of interfaces[nome] || []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}

servidorHttp.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
  console.log(`TV:         http://localhost:${PORTA}/tv`);
  console.log(`Controle:   http://localhost:${PORTA}/controlador`);

  const ipLocal = obterIpLocal();
  if (ipLocal) {
    const linkControlador = `http://${ipLocal}:${PORTA}/controlador?codigo=${sala.codigo}`;
    console.log(`Na rede:    ${linkControlador}`);
    sala.definirLinkControlador(linkControlador);
  } else {
    console.log("Não achei um IP de rede local - o QR code na TV não vai aparecer.");
  }
});

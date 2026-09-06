const { criarServidor } = require("./app");

const PORTA = process.env.PORTA || 3000;

const { servidorHttp, sala } = criarServidor();
console.log(`Sala criada com o código: ${sala.codigo}`);

servidorHttp.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
  console.log(`TV:         http://localhost:${PORTA}/tv`);
  console.log(`Controle:   http://localhost:${PORTA}/controlador`);
});

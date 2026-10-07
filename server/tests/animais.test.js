const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidorDeTeste, criarCliente, entrarNaSala } = require("./ajuda");
const { ANIMAIS } = require("../animais");

test("são 8 animais distintos e a sala aceita até 8 jogadores", async (t) => {
  assert.equal(ANIMAIS.length, 8);
  assert.equal(new Set(ANIMAIS.map((a) => a.id)).size, 8);

  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);
  assert.equal(sala.cfg.maxJogadores, 8);

  for (let i = 0; i < 8; i++) await entrarNaSala(porta, `J${i}`, sala.codigo);

  const nono = criarCliente(porta);
  await nono.aberto();
  nono.enviar({ type: "entrar", nome: "Nono", codigoSala: sala.codigo });
  const erro = await nono.esperar("erroEntrada");
  assert.match(erro.mensagem, /cheia/i);
});

test("quem entra começa sem animal e escolher um avisa todo mundo", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo, { escolherAnimal: false });
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo, { escolherAnimal: false });
  assert.equal(sala.jogadores.get(ana.jogadorId).avatar, null);

  ana.cliente.enviar({ type: "escolherAnimal", animalId: "panda" });
  const escolhido = await ana.cliente.esperar("animalEscolhido");
  assert.equal(escolhido.animalId, "panda");

  // o último "jogadoresAtualizados" que o Bruno recebe já mostra o panda da Ana
  let lista;
  do {
    lista = (await bruno.cliente.esperar("jogadoresAtualizados")).jogadores;
  } while (!lista.find((j) => j.nome === "Ana").animalId);
  const daAna = lista.find((j) => j.nome === "Ana");
  assert.equal(daAna.animalId, "panda");
  assert.equal(daAna.avatar.emoji, "🐼");
  assert.equal(daAna.avatar.cor, "#1e90ff");
});

test("animal já escolhido por outro jogador é recusado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo, { escolherAnimal: false });
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo, { escolherAnimal: false });
  ana.cliente.enviar({ type: "escolherAnimal", animalId: "leao" });
  await ana.cliente.esperar("animalEscolhido");

  bruno.cliente.enviar({ type: "escolherAnimal", animalId: "leao" });
  const erro = await bruno.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já foi escolhido/i);
  assert.equal(sala.jogadores.get(bruno.jogadorId).animalId, null);
});

test("animal inexistente é recusado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo, { escolherAnimal: false });
  ana.cliente.enviar({ type: "escolherAnimal", animalId: "dragao" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /inválido/i);
});

test("dá para trocar de animal e o antigo fica livre pros outros", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo, { escolherAnimal: false });
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo, { escolherAnimal: false });
  ana.cliente.enviar({ type: "escolherAnimal", animalId: "sapo" });
  await ana.cliente.esperar("animalEscolhido");
  ana.cliente.enviar({ type: "escolherAnimal", animalId: "tigre" });
  await ana.cliente.esperar("animalEscolhido");

  bruno.cliente.enviar({ type: "escolherAnimal", animalId: "sapo" });
  const ok = await bruno.cliente.esperar("animalEscolhido");
  assert.equal(ok.animalId, "sapo");
});

test("quando o jogador sai, o animal dele volta a ficar livre", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo, { escolherAnimal: false });
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo, { escolherAnimal: false });
  ana.cliente.enviar({ type: "escolherAnimal", animalId: "polvo" });
  await ana.cliente.esperar("animalEscolhido");
  ana.cliente.fechar();
  while ((await bruno.cliente.esperar("jogadoresAtualizados")).jogadores.length !== 1);

  bruno.cliente.enviar({ type: "escolherAnimal", animalId: "polvo" });
  const ok = await bruno.cliente.esperar("animalEscolhido");
  assert.equal(ok.animalId, "polvo");
});

test("não dá para iniciar a partida enquanto alguém estiver sem animal", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  await entrarNaSala(porta, "Bruno", sala.codigo, { escolherAnimal: false });

  ana.cliente.enviar({ type: "iniciarPartida" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /animal/i);
  assert.equal(sala.estado, "lobby");
});

test("depois que a partida começa não dá mais para trocar de animal", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  await entrarNaSala(porta, "Bruno", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });
  await ana.cliente.esperar("escolhaPorta");

  ana.cliente.enviar({ type: "escolherAnimal", animalId: "pinguim" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já começou/i);
});

test("'trocar animal' libera o animal na hora, antes de escolher outro", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo, { escolherAnimal: false });
  const bruno = await entrarNaSala(porta, "Bruno", sala.codigo, { escolherAnimal: false });
  ana.cliente.enviar({ type: "escolherAnimal", animalId: "sapo" });
  await ana.cliente.esperar("animalEscolhido");

  ana.cliente.enviar({ type: "liberarAnimal" });
  // o Bruno vê a Ana sem animal
  let lista;
  do {
    lista = (await bruno.cliente.esperar("jogadoresAtualizados")).jogadores;
  } while (lista.find((j) => j.nome === "Ana").animalId);
  assert.equal(lista.find((j) => j.nome === "Ana").avatar, null);

  // e já pode pegar o sapo, mesmo com a Ana ainda sem escolher outro
  bruno.cliente.enviar({ type: "escolherAnimal", animalId: "sapo" });
  const ok = await bruno.cliente.esperar("animalEscolhido");
  assert.equal(ok.animalId, "sapo");
  assert.equal(sala.jogadores.get(ana.jogadorId).animalId, null);
});

test("quem liberou o animal e ainda não escolheu outro impede o início da partida", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  await entrarNaSala(porta, "Bruno", sala.codigo);
  ana.cliente.enviar({ type: "liberarAnimal" });
  await ana.cliente.esperar("jogadoresAtualizados");
  while (sala.jogadores.get(ana.jogadorId).animalId) await new Promise((r) => setTimeout(r, 5));

  ana.cliente.enviar({ type: "iniciarPartida" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /animal/i);
});

test("liberar animal depois que a partida começou é recusado", async (t) => {
  const { porta, sala, fechar } = await subirServidorDeTeste();
  t.after(fechar);

  const ana = await entrarNaSala(porta, "Ana", sala.codigo);
  await entrarNaSala(porta, "Bruno", sala.codigo);
  ana.cliente.enviar({ type: "iniciarPartida" });
  await ana.cliente.esperar("escolhaPorta");

  ana.cliente.enviar({ type: "liberarAnimal" });
  const erro = await ana.cliente.esperar("erroAcao");
  assert.match(erro.mensagem, /já começou/i);
  assert.ok(sala.jogadores.get(ana.jogadorId).animalId);
});

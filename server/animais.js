// Os 8 animais que o jogador escolhe no lobby. Cada um é de um jogador só.
// Emoji e cor vêm do protótipo da TV (teste.html).
const ANIMAIS = [
  { id: "raposa", nome: "Raposa", emoji: "🦊", cor: "#ff4757" },
  { id: "panda", nome: "Panda", emoji: "🐼", cor: "#1e90ff" },
  { id: "sapo", nome: "Sapo", emoji: "🐸", cor: "#2ed573" },
  { id: "leao", nome: "Leão", emoji: "🦁", cor: "#ffa502" },
  { id: "unicornio", nome: "Unicórnio", emoji: "🦄", cor: "#9b59b6" },
  { id: "pinguim", nome: "Pinguim", emoji: "🐧", cor: "#00d2d3" },
  { id: "polvo", nome: "Polvo", emoji: "🐙", cor: "#ff6b81" },
  { id: "tigre", nome: "Tigre", emoji: "🐯", cor: "#ff7f50" },
];

function buscarAnimal(id) {
  return ANIMAIS.find((a) => a.id === id) || null;
}

module.exports = { ANIMAIS, buscarAnimal };

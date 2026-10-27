# Upgrades a fazer

Regras:
- Toda mudança no projeto passa por este arquivo; só mexo no código depois de o item estar aqui e aprovado.
- Quando um upgrade é concluído e verificado, ele **sai** deste arquivo (não fica marcado como feito).

Status: `[ ]` a fazer · `[~]` em andamento

Branch de trabalho desta leva: `novos-poderes`.

Os arquivos em `teste/` são **referência visual de design**, feitos à parte.
Nenhum deles roda no jogo nem é portado para dentro dele: servem para a implementação
em `public/` saber com o que se parecer.

---

## Telas que faltam desenhar

- [ ] **Ligação e Classificação no visual novo.** As telas desses dois desafios, na TV e
      no celular, continuam as de antes. Só saiu o corte do placar em 5 nomes: a TV agora
      lista todo mundo. As referências novas vão ser feitas em `teste/`, e depois as telas
      são portadas para `public/` como as outras.

---

## Banco de perguntas

Hoje são **470 perguntas**: 28 fáceis e 12 difíceis em cada um dos 8 temas, mais as
médias (de 16 a 24, conforme o tema). Ao mexer no banco, rode `npm run validar` dentro
de `server/`: ele confere id repetido, nível escrito errado, alternativa igual à
resposta, enunciado duplicado e perguntas do mesmo tema com a mesma resposta — que
costumam ser o mesmo fato escrito de outro jeito. O mesmo check roda em `npm test`.

- [ ] **Trocar as perguntas que o Rodrigo quiser substituir.** As 126 que entraram na
      última leva foram escritas para tapar o buraco do nível difícil e nivelar o fácil;
      a ideia é que sejam trocadas aos poucos por outras melhores. Os ids 345 a 470 são
      todos dessa leva.

- [ ] **Médio é o nível mais magro agora.** Ficou em 150 perguntas, com Cinema e TV,
      Ciência e Natureza e Geografia com 16 cada. Dá e sobra para uma partida (precisa de
      3), mas é o nível que menos varia entre partidas seguidas.

- [ ] **Mais temas.** Com 5 temas usados por partida e 8 no acervo, duas partidas
      seguidas repetem a maioria dos assuntos. Um tema novo precisa de pelo menos 3
      perguntas em cada nível para poder ser sorteado em qualquer rodada.

- [ ] **Mais conjuntos de Ligação e de Classificação.** O sorteio já não repete conjunto
      dentro da mesma partida, mas existem só **6 de cada** (data/associacoes.json e
      data/classificacoes.json). Com o alternado fixo são 3 Ligações e 2 Classificações
      por partida, então toda partida mostra metade do acervo de Ligação.

---

## Desempenho

- [ ] **Guardar o banco de perguntas na memória.** `carregarBanco()`
      (server/perguntas.js) faz `readFileSync` + `JSON.parse` do `perguntas.json`
      inteiro **a cada pergunta sorteada** e a cada sorteio de portas. Numa partida são
      umas 100 leituras do mesmo arquivo; no teste do acervo, 67 mil, o que fazia a
      suíte levar 3 minutos.
      Num PC não se nota, mas o jogo roda em Raspberry Pi com cartão SD, onde ler
      arquivo é lento — e a leitura acontece no meio da partida, entre uma pergunta e
      outra. Ler uma vez ao subir o servidor resolve.
      Era "fora do escopo"; está aqui agora porque o custo apareceu medido. O cuidado:
      hoje dá pra editar o `perguntas.json` com o servidor ligado e a mudança vale na
      hora; com cache, passaria a precisar reiniciar.

---

## Para medir numa partida de verdade

- [ ] **Duração da partida.** A conta dá uns 27 minutos: 15 perguntas, 10 fases de poder
      (com a animação de quem atacou quem, até 16s cada), 5 desafios de 30s, a largada e
      a corrida da Pirâmide. Medir com gente na sala antes de mexer nos tempos.

---

## Fora do escopo por enquanto

Salas múltiplas, hospedagem na web e timeout da Pirâmide.

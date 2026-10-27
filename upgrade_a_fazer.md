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

- [ ] **O nível difícil está quase vazio.** Distribuição real hoje:

      | Tema | fácil | médio | difícil |
      |---|---|---|---|
      | Geografia | 23 | 16 | 4 |
      | História | 19 | 20 | 4 |
      | Ciência e Natureza | 24 | 16 | 3 |
      | Esportes | 21 | 21 | **1** |
      | Cinema e TV | 25 | 16 | **2** |
      | Música | 20 | 17 | 6 |
      | Games | 20 | 20 | 3 |
      | Arte e Literatura | 14 | 24 | 5 |
      | **Total** | **166** | **150** | **28** |

      O tema difícil da partida precisa de 3 perguntas daquele nível. Enquanto o acervo
      não cresce, as portas do tema difícil só oferecem temas que ainda têm 3 perguntas
      difíceis sem usar (`sortearPortas` em server/perguntas.js), então **Esportes e
      Cinema e TV nunca aparecem no tema 5**, e Ciência e Games, quando aparecem, trazem
      sempre as mesmas três.
      **O jogo não quebra por causa disso** — 2000 partidas simuladas com a config real
      não repetiram nenhuma pergunta nem entregaram pergunta fora do nível. O preço é
      outro: sobram só 6 temas elegíveis para o tema 5, e 4 deles já foram jogados nos
      temas 1 a 4, então em **99,5% das partidas uma das 4 portas do tema difícil é um
      tema repetido**. Nos temas 1 a 4 isso nunca acontece.
      Meta sugerida: pelo menos 12 perguntas por (tema × nível), o que levaria o difícil
      de 28 para perto de 96. Os níveis fácil e médio já estão razoáveis.
      Ao adicionar perguntas, rode `npm run validar` dentro de `server/`: ele confere id
      repetido, nível escrito errado, alternativa igual à resposta e enunciado duplicado,
      e mostra o estoque por tema × nível. O mesmo check roda em `npm test`.

- [ ] **Mais temas e mais perguntas.** Com 5 temas usados por partida e 8 temas no
      acervo, duas partidas seguidas repetem a maioria dos temas. Ampliar o acervo de
      temas, e as perguntas de cada um, nos três níveis.

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

# Upgrades a fazer

Regras:
- Toda mudança no projeto passa por este arquivo; só mexo no código depois de o item estar aqui e aprovado.
- Quando um upgrade é concluído e verificado, ele **sai** deste arquivo (não fica marcado como feito).

Status: `[ ]` a fazer · `[~]` em andamento

Branch de trabalho desta leva: `novos-poderes`.

Os arquivos `teste*.html` na raiz são **referência visual de design**, feitos à parte.
Nenhum deles roda no jogo nem é portado para dentro dele: servem para a implementação
em `public/` saber com o que se parecer.

---

## Estrutura da partida

- [ ] **5 temas de 3 perguntas, com dificuldade crescente.** Hoje `totalRodadas: 3` e
      `perguntasPorRodada: 3` (server/sala.js:20-21) dão 9 perguntas.
      Passa para 5 temas de 3 perguntas (15 no total), e os temas têm nível fixo:
      **2 fáceis, 2 médios e 1 difícil**, nessa ordem. As 3 perguntas de um tema saem
      todas do nível daquele tema.
      Depois de cada tema vem um desafio — **alternando fixo**: Ligação no tema 1,
      Classificação no tema 2, Ligação no 3, Classificação no 4, Ligação no 5. São 5
      desafios por partida. Só então a Pirâmide.
      **A fase de poder passa a ser intercalada.** Hoje toda pergunta tem escolha de poder
      e de alvo, o que dá 15 rituais de 30s por partida — 7min30 só escolhendo, e a coisa
      enjoa. Passa a acontecer só na **2ª e na 3ª pergunta de cada tema**:

      ```
      TEMA 1   q1 limpa   q2 PODER   q3 PODER
      TEMA 2   q4 limpa   q5 PODER   q6 PODER
      TEMA 3   q7 limpa   q8 PODER   q9 PODER
      TEMA 4  q10 limpa  q11 PODER  q12 PODER
      TEMA 5  q13 limpa  q14 PODER  q15 PODER
      ```

      São 10 fases de poder em vez de 15. A primeira pergunta de cada tema abre limpa, o
      que resolve de saída o problema da primeira pergunta da partida: no começo ninguém
      tem pontos e não há em quem mirar com critério.
      O ritmo fica igual em todo tema, e as cotas continuam fazendo sentido: cada jogador
      tem 8 usos limitados na partida (Escudo 3 + Aposta 3 + Pedágio 2) para 10 fases,
      então ainda sobra espaço para o Congelamento, os Mordicadores e a Névoa, que são
      ilimitados. Com menos fases que isso, os ilimitados virariam conteúdo morto.
      A Festa de Pontos continua cabendo: os temas 2 e 4 têm fase de poder nas perguntas
      5 e 6, e 11 e 12.

      **Efeito no tempo de jogo:** uma pergunta sem poder custa 23s fixos (8s de leitura +
      15s de resposta); uma com poder custa 53s, mais a animação do passo 5 (até 16s).
      Com 15 perguntas, 10 fases de poder e 5 desafios de 30s, a partida sai de uns 15
      minutos para uns 27. Vale medir antes de testar com gente na sala.

- [ ] **Sortear pergunta por dificuldade.** O campo `dificuldade` já existe em todas as
      344 perguntas, mas o servidor **não usa**: `sortearPergunta()` (server/perguntas.js)
      filtra só por categoria e apenas repassa a dificuldade ao cliente
      (server/perguntas.js:47). Precisa passar a receber o nível e filtrar por ele também.

---

## Banco de perguntas

- [ ] **O nível difícil está quase vazio — isto bloqueia a dificuldade crescente.**
      Distribuição real hoje:

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

      O tema difícil da partida precisa de 3 perguntas daquele nível. **Esportes (1) e
      Cinema e TV (2) não conseguem montar um tema difícil.** Ciência e Games têm
      exatamente 3, ou seja, cairiam sempre as mesmas três em toda partida. Só 4 dos 8
      temas têm alguma folga.
      Meta sugerida: pelo menos 12 perguntas por (tema × nível), o que levaria o difícil
      de 28 para perto de 96. Os níveis fácil e médio já estão razoáveis.

- [ ] **Mais temas e mais perguntas.** Com 5 temas usados por partida e 8 temas no
      acervo, duas partidas seguidas repetem a maioria dos temas. Ampliar o acervo de
      temas, e as perguntas de cada um, nos três níveis.

- [ ] **Não repetir desafio dentro da mesma partida.** Pré-requisito da estrutura nova.
      Existem só **6 conjuntos de Ligação e 6 de Classificação**
      (data/associacoes.json e data/classificacoes.json), e o sorteio hoje não tem
      memória nenhuma: `sortearConjuntoAssociacao()` e `sortearConjuntoClassificacao()`
      são chamados sem argumento, enquanto `sortearPergunta()` já recebe
      `this.idsPerguntasUsadas` e evita repetição.
      Com 5 desafios por partida saindo de 6 conjuntos sorteados às cegas, a chance de
      **repetir um desafio na mesma partida é de 91%**.
      A correção é pequena: passar a lista de usados para as duas funções, igual já é
      feito com as perguntas.
      Com o alternado fixo são 3 Ligações e 2 Classificações por partida, então o acervo
      de Ligação aperta mais. Criar mais conjuntos dos dois tipos (já combinado).

---

## Pirâmide do Conhecimento

Referência visual: `teste-piramide-final.html`. É uma pirâmide isométrica 3D de **8 níveis**,
onde o nível N é uma laje de N×N blocos — 204 blocos no total, base 8×8, topo 1×1.
Os níveis são numerados **0 na base e 7 no topo** (`TOPO = TOTAL_ANDARES - 1`).

Os jogadores **não ficam em blocos discretos**: cada um tem um `side` (borda esquerda ou
direita da pirâmide) e uma `lane` de 0 a 1 (posição ao longo daquela borda), e
`posicaoNoNivel(jogador, nivel)` calcula onde ele aparece em qualquer nível a partir
desses dois valores.

- [ ] **Largada por pontuação.** Hoje a Pirâmide tem 10 degraus (`piramideDegraus: 10`) e
      a largada sai do **lugar no placar**, não dos pontos:
      `posicaoInicial = alturaMaximaLargada × (total - 1 - rank) / (total - 1)`
      (server/sala.js:1269-1275). Quem lidera por 10 pontos larga igual a quem lidera por
      1000, e a vantagem é enorme: o primeiro larga no degrau 8 de 10, precisando de 2
      acertos contra 10 do último.
      Passa a ser calculada assim:

      ```
      MAX_PULOS = 4     // teto: ninguém larga mais que 4 níveis acima da base
      MENOR = menor pontuação da sala
      MAIOR = maior pontuação da sala

      para cada jogador:
        tPontos = (pontos - MENOR) / (MAIOR - MENOR)   // 0 a 1
        tLugar  = (n - 1 - colocação) / (n - 1)        // 1 = primeiro, 0 = último
        t       = 0,5 × tPontos + 0,5 × tLugar
        pulos   = arredondar(MAX_PULOS × t^1,5)        // 0 a 4
        nível   = pulos                                // 0 = base, 7 = topo
      ```

      Três decisões embutidas, cada uma resolvendo um problema:
      1. **Teto de 4 pulos** em 8 níveis puxa o campo todo para baixo: o primeiro larga no
         meio da pirâmide, não perto do topo. Precisa de 3 acertos contra 7 do último —
         vantagem real, mas bem menor que os 2 contra 10 de hoje. Pelas simulações, só o
         primeiro colocado chega no teto; o resto fica entre 0 e 3 pulos.
      2. **Expoente 1,5** faz a vantagem crescer devagar no meio da tabela e acelerar só
         perto do topo, em vez de distribuir linearmente.
      3. **Metade pontos, metade colocação.** Só com pontos (min-max puro), um jogador
         muito na frente ou muito atrás estica a faixa e achata todo o resto no mesmo
         nível — simulei e, com um líder disparado, do 2º ao 8º largavam todos juntos na
         base. A parte da colocação garante que o placar sempre vire níveis diferentes, e
         a parte dos pontos mantém a proporção.

      **Detalhe dos empates:** jogadores com a mesma pontuação compartilham a colocação,
      então largam no mesmo nível — que é o certo. Um efeito colateral: se a sala inteira
      empatar, `tPontos` vale 0 mas `tLugar` vale 1 para todos, e todos largam no nível 1
      em vez do 0. Dá no mesmo, porque é uniforme, mas se preferir que um empate geral
      comece na base é só zerar os pulos quando MAIOR == MENOR.

- [ ] **Cada acerto sobe um nível.** A largada vale só para o começo; dali em diante quem
      sobe é quem acerta, **um nível por resposta certa**. A regra de subida que o jogo já
      tem está certa (`progresso.posicao++`, server/sala.js:775) — o que muda é só o
      total, de 10 degraus para 8 níveis, e de onde cada um parte.
      Errar continua como já é hoje e **não** custa nível: a alternativa errada entra em
      `tentativasErradas`, a pergunta continua na tela e o jogador tenta de novo até
      acertar (server/sala.js:769-772). O custo de errar é tempo, não posição — é a única
      fase da partida em que isso vale.
      Quantas respostas certas cada um precisa: **3 para quem larga no nível 4** e **7
      para quem larga na base**.

- [ ] **Animação da corrida na TV.** Os bonecos sobem de nível em nível enquanto a corrida
      acontece — é o que deixa a mesa ver quem vai ganhar. O servidor já transmite
      `progressoPiramide` a cada acerto, para todos e para a TV (server/sala.js:776-778),
      então o gancho existe; falta ligar a TV nele.
      A `teste-piramide-final.html` já resolve a animação inteira: salto com arco
      (`ALTURA_PULO`), easing cúbico, sombra que encolhe e clareia no ar, e `z-index`
      calculado pela posição na tela para o boneco nunca sumir atrás de um bloco. A
      corrida de lá é simulada com sorteio ponderado por velocidade; no jogo de verdade
      quem dispara o passo é o acerto do jogador.
      **A posição relativa sai de graça.** Como cada jogador tem `side` e `lane` fixos e
      `posicaoNoNivel()` recalcula a tela a partir deles, o boneco sobe reto e mantém sua
      faixa sozinho. Isso resolve de vez os dois problemas que a pirâmide de blocos tinha:
      não existe mais colisão de bloco entre vizinhos, nem limite de capacidade por nível.
      **A definir:** as `lane` estão fixas para 8 jogadores (4 em cada borda, em 0.18,
      0.40, 0.62 e 0.83). O jogo tem de 2 a 8, então as faixas precisam ser distribuídas
      conforme a sala — por exemplo dividindo cada borda igualmente entre os jogadores que
      couberem nela.

---

## Jogos de Poder — reformulação

A lista final fica com 7 poderes: Congelamento, Mordicadores, Névoa, Pedágio,
Aposta, Escudo e Festa de Pontos.

Sequência de telas combinada:

| # | TV | Celular |
|---|---|---|
| 1 | Login | Login |
| 2 | Escolher o boneco | Escolher o boneco |
| 3 | Escolher a porta | Escolher a porta |
| 4 | Escolher poderes | Escolher o poder |
| 5 | **Quem atacou quem** (nova) | **"Olhe para a TV"** (nova) |
| 6 | Pergunta | Pergunta |
| 7 | Resposta | Resposta |

**Decidido:** o passo 4 continua em **duas** telas, como já é hoje —
`escolha_poder` (qual poder, 10s) e depois `escolha_alvo` (em quem, 20s). Não mexer.

**Princípio que resolve as dúvidas de escopo:** o poder é escolhido e resolvido **por
pergunta**, nunca por tema. Tudo que um poder tira, dá ou dobra se refere aos pontos
daquela pergunta.

**Limites de uso** — Escudo (3), Pedágio (2) e Aposta (3) são cotas **de cada jogador**
na partida inteira. A Festa de Pontos é diferente: são 2 usos **da partida toda**, presos
ao tema 2 e ao tema 4.

Onde os poderes vivem hoje: `TIPOS_DE_PODER` em server/sala.js:13, `POR_TIPO` em
public/controlador/controlador.js:12 e `montarObstrucao()` em
public/controlador/controlador.js:1038.

- [ ] **Tela de "quem atacou quem" (passo 5).** Fase nova entre `escolha_alvo` e a
      abertura da tela da pergunta, só para descontrair. Só acontece nas perguntas que têm
      fase de poder — a 2ª e a 3ª de cada tema. A TV mostra, na ordem em que os
      jogadores entraram na sala (`this.jogadores` é um Map, então já itera nessa ordem),
      cada um usando seu poder: um projétil sai do pod de quem atacou e acerta o pod do
      alvo. Ataque que bate em quem usou Escudo é rebatido, com animação de proteção.
      Terminada a sequência o jogo segue igual a hoje: abre a tela da pergunta, que já
      começa com a fase de leitura (`fase-leitura` vive dentro de `tela-pergunta`, não é
      tela separada).
      **Tempo: 2 segundos por jogador que usou poder.** Teto de 16s com os 8 atacando.
      **No celular**, durante a sequência inteira: tela nova com "Olhe para a TV" no centro.
      **Referência visual** — `teste-poderes.html` (o projétil, a cena do escudo e o
      dicionário `PODERES` classificando cada poder em `ataque | defesa | global`) e
      `teste-poderes-festaDePontos.html` (a Festa de Pontos com confete, e os 8 jogadores
      no `.players-dock` do `teste.html`, que resolve o layout da sala cheia).
      A implementação é nova, em `public/tv/tv.js` e `public/tv/tv.css`, mais a tela de
      espera em `public/controlador/`. Os arquivos `teste*` não entram no jogo.
      Duas decisões a tomar na implementação, porque a referência resolve de um jeito que
      não serve à partida de verdade:
      1. Na referência cada poder novo apaga o anterior. No jogo os efeitos **acumulam**
         (`efeitosAtivos` é um array por alvo), então a sequência deve empilhar e terminar
         mostrando o estado final de todo mundo.
      2. Na cena do escudo a referência revela a defesa antes de o ataque sair. Mais forte
         ao contrário: o ataque voa, e o escudo só se revela no impacto.
      A Névoa borrar o nome do jogador na TV está ok: o efeito só existe durante esta
      animação, não durante a partida.

- [ ] **Remover Gosma e Bombolha.** A Gosma nunca teve comportamento próprio: cai no
      mesmo contador de toques do Congelamento (`e.tipo === "congelamento" || e.tipo === "gosma"`),
      então a ideia de limpar com o dedo nunca existiu. A Bombolha tinha código próprio
      (bolhas em posição aleatória) mas no mesmo painel que cobre tudo. Tirar os dois de
      `TIPOS_DE_PODER`, de `POR_TIPO` e de `montarObstrucao()`.

- [ ] **Congelamento: um gelo em cada alternativa.** Hoje um painel único cobre as 4
      respostas e 3 toques liberam todas de uma vez. Passa a ser um bloco de gelo por
      alternativa: o jogador quebra só o da resposta que quer.
      **Números:** 2 toques por bloco. Cada ataque acumulado soma +1 toque em todos os
      blocos. Hoje são 3 toques para liberar tudo, então quem já decidiu passa a pagar
      menos que hoje e quem está em dúvida paga mais.
      Referência visual: `teste-gelo.html`, que confirma a regra e resolve o detalhe de
      como o gelo some. O primeiro toque abre um buraco de ~38px no ponto onde o dedo
      encostou e deixa o resto do gelo translúcido; o segundo faz o buraco crescer até
      cobrir o bloco e o gelo é removido; **o terceiro toque é o que responde**
      (`if (hits >= 2) { lockAnswer(btn); return; }`). Solta flocos de neve ao longo da
      borda que derrete.
      **Custo de tempo:** as duas animações levam 450ms e 750ms, e durante elas os toques
      são ignorados (`btn.dataset.busy`). Então derreter uma alternativa custa no mínimo
      **1,2 segundo** dos 15 de resposta, mesmo para quem toca rápido — e esse é o custo
      real do poder, mais que os toques em si.

- [ ] **Névoa (novo).** As alternativas do alvo aparecem borradas e vão clareando.
      **Números:** limpa sozinha em 5s. Cada ataque acumulado soma +1s. O borrão **não**
      aumenta com o acúmulo: se aumentasse, dois ataques deixariam a tela ilegível e a
      resposta viraria sorte, em vez de continuar sendo a decisão de chutar ou esperar.

- [ ] **Escudo (novo).** Em vez de atacar, o jogador se protege.
      **Números:** bloqueia **todos** os ataques daquela pergunta. Cada jogador tem **3
      escudos na partida inteira**. É a trava que impede o jogo de virar "todo mundo se
      defende e ninguém ataca". Na TV, cada ataque bloqueado ganha a animação de proteção
      (ver o item do passo 5).

- [ ] **Festa de Pontos (novo).** Todos que acertarem aquela pergunta ganham o dobro.
      **Números:** dobra só o acerto base (100 vira 200). O bônus de velocidade não dobra,
      senão uma pergunta valeria 400 e uma rodada sozinha decidiria a partida.
      Disponível **2 vezes na partida**: no tema 2 e no tema 4, o penúltimo antes da
      Pirâmide.
      **Na tela:** aparece normalmente na sequência de "quem atacou quem", seguindo a
      referência visual de `teste-poderes-festaDePontos.html` (confete e os pods pulando). O
      **dobro só é revelado na tela de pontuação** — durante a animação a mesa vê que
      alguém ativou, mas o efeito nos pontos só aparece no placar.

- [ ] **Pedágio (novo).** Não mexe na tela do alvo.
      **Números:** leva **metade dos pontos que o alvo fizer naquela pergunta** — não do
      tema inteiro, porque o poder é escolhido e resolvido por pergunta. Cada jogador
      pode usar **2 vezes na partida inteira**. O alvo descobre na revelação.

- [ ] **Aposta (novo).** O jogador aposta **a favor** do alvo.
      **Números:** se o alvo **acertar**, ganha **+75**; se o alvo **errar**, perde
      **-50**. Cada jogador pode usar **3 vezes na partida inteira**. O alvo não sabe que
      foi apostado, senão mudaria o comportamento dele.
      Isso inverte o sentido do poder: em vez de torcer contra alguém, você escolhe em
      quem confia — e mirar em quem sabe muito passa a ser o jogo.
      Ideia de tela: é o único poder que não se resolve na hora, então o dado pode ficar
      girando no pod do alvo até a revelação da pergunta — um segundo ato só dele.

---

## Rede

- [ ] **Escolha da interface de rede para o QR code.** `obterIpLocal()` (server/index.js:12)
      devolve o primeiro IPv4 não-interno que encontrar. Com cabo e Wi-Fi ligados ao mesmo
      tempo, ele pode anunciar no QR code a interface errada, e os celulares não chegam no
      jogo. Hoje está contornado só pela documentação ("deixe uma das duas ativa"). A correção
      seria escolher a interface pela rota padrão.

---

## Fora do escopo por enquanto

Salas múltiplas, hospedagem na web, timeout da Pirâmide e cache do banco de perguntas.

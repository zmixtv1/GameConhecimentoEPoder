# Upgrades a fazer

Regras:
- Toda mudança no projeto passa por este arquivo; só mexo no código depois de o item estar aqui e aprovado.
- Quando um upgrade é concluído e verificado, ele **sai** deste arquivo (não fica marcado como feito).

Status: `[ ]` a fazer · `[~]` em andamento

Branch de trabalho desta leva: `novos-poderes`.

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
      **Efeito no tempo de jogo:** cada pergunta custa hoje 53s fixos (10s de escolha de
      poder + 20s de alvo + 8s de leitura + 15s de resposta), mais revelação e mais a
      animação nova do passo 5 (até 16s). Com 15 perguntas e 5 desafios de 30s, a partida
      sai de uns 15 minutos para uns 30. Vale medir antes de testar com gente na sala.

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

Onde os poderes vivem hoje: `TIPOS_DE_PODER` em server/sala.js:13, `POR_TIPO` em
public/controlador/controlador.js:12 e `montarObstrucao()` em
public/controlador/controlador.js:1038.

- [ ] **Tela de "quem atacou quem" (passo 5).** Fase nova entre `escolha_alvo` e a
      abertura da tela da pergunta, só para descontrair. A TV mostra, na ordem em que os
      jogadores entraram na sala (`this.jogadores` é um Map, então já itera nessa ordem),
      cada um usando seu poder: um projétil sai do pod de quem atacou e acerta o pod do
      alvo. Ataque que bate em quem usou Escudo é rebatido, com animação de proteção.
      Terminada a sequência o jogo segue igual a hoje: abre a tela da pergunta, que já
      começa com a fase de leitura (`fase-leitura` vive dentro de `tela-pergunta`, não é
      tela separada).
      **Tempo: 2 segundos por jogador que usou poder.** Teto de 16s com os 8 atacando.
      **No celular**, durante a sequência inteira: tela nova com "Olhe para a TV" no centro.
      Protótipos: `teste-poderes.html` (projétil, cena do escudo, dicionário `PODERES`
      classificando cada poder em `ataque | defesa | global`) e
      `teste-poderes-festaDePontos.html` (8 jogadores e a Festa de Pontos com confete).
      O layout de 8 jogadores já está resolvido: os dois usam o `.players-dock` do
      `teste.html`, com os pods lado a lado.
      Duas coisas que os protótipos ainda não resolvem:
      1. `limparTodosStatus()` zera os efeitos a cada poder novo. No jogo eles acumulam
         (`efeitosAtivos` é um array por alvo), então a sequência deve empilhar e terminar
         mostrando o estado final de todo mundo.
      2. Na cena do escudo o protótipo revela a defesa antes de o ataque sair. Mais forte
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
      **Na tela:** aparece normalmente na sequência de "quem atacou quem", com o visual
      próprio de `teste-poderes-festaDePontos.html` (confete e os pods pulando). O
      **dobro só é revelado na tela de pontuação** — durante a animação a mesa vê que
      alguém ativou, mas o efeito nos pontos só aparece no placar.

- [ ] **Pedágio (novo).** Não mexe na tela do alvo.
      **Números:** leva **metade dos pontos que o alvo fizer**, e cada jogador pode usar
      **2 vezes na partida inteira**. O alvo descobre na revelação.
      A confirmar: "pontos da rodada" foi entendido como os pontos daquela pergunta. Se
      a ideia era metade do que ele somou no tema inteiro (3 perguntas), muda muito.

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

# Upgrades a fazer

Regras:
- Toda mudança no projeto passa por este arquivo; só mexo no código depois de o item estar aqui e aprovado.
- Quando um upgrade é concluído e verificado, ele **sai** deste arquivo (não fica marcado como feito).

Status: `[ ]` a fazer · `[~]` em andamento

Branch de trabalho desta leva: `novos-poderes`.

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

**Decisão em aberto que vale para o conjunto todo:** hoje cada jogador escolhe um
poder em toda pergunta. Se Escudo e Festa de Pontos custarem o mesmo que atacar,
ninguém ataca mais. Definir se esses dois são de **uso único na partida** (como já
é o poder de garantir a porta, controlado por `jogadoresQueUsaramPoderPorta` em
server/sala.js) ou se têm outro custo.

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
      Protótipo visual em `teste-poderes.html`, com o dicionário `PODERES` classificando
      cada poder em `ataque | defesa | global` — essa classificação deve ir para o servidor.
      Três coisas que o protótipo ainda não resolve:
      1. Posiciona dois pods nas laterais com `justify-content: space-between`. O jogo tem
         de 2 a 8 jogadores, então precisa virar grade ou arco.
      2. `limparTodosStatus()` zera os efeitos a cada poder novo. No jogo eles acumulam
         (`efeitosAtivos` é um array por alvo), então a sequência deve empilhar e terminar
         mostrando o estado final de todo mundo.
      3. Na cena do escudo o protótipo revela a defesa antes de o ataque sair. Mais forte
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
      alternativa: o jogador quebra só o da resposta que quer. Quem sabe paga barato,
      quem está em dúvida paga caro, e dá para quebrar o gelo errado no susto.
      **Números:** 2 toques por bloco. Cada ataque acumulado soma +1 toque em todos os
      blocos. Hoje são 3 toques para liberar tudo, então quem já decidiu passa a pagar
      menos que hoje e quem está em dúvida paga mais.

- [ ] **Névoa (novo).** As alternativas do alvo aparecem borradas e vão clareando ao
      longo de alguns segundos. Cria a decisão de chutar no borrão ou esperar enxergar e
      perder o bônus de velocidade. É filtro CSS, sem camada de obstrução.
      **Números:** limpa sozinha em 5s. Cada ataque acumulado soma +1s. O borrão **não**
      aumenta com o acúmulo: se aumentasse, dois ataques deixariam a tela ilegível e a
      resposta viraria sorte, em vez de continuar sendo a decisão de chutar ou esperar.

- [ ] **Escudo (novo).** Em vez de atacar, o jogador se protege: anula os poderes que
      vierem contra ele naquela pergunta. É o que mais muda o jogo, porque a fase de
      poder passa a ter duas decisões ("bato ou me defendo?") e quem está na frente
      ganha motivo real para se proteger. Na TV, cada ataque bloqueado ganha a animação
      de proteção (ver o item do passo 5).
      **Números:** bloqueia **todos** os ataques daquela pergunta. Cada jogador tem **3
      escudos na partida inteira**. É a trava que impede o jogo de virar "todo mundo se
      defende e ninguém ataca".

- [ ] **Festa de Pontos (novo).** Todos que acertarem aquela pergunta ganham o dobro,
      inclusive os adversários. Vale usar quando você tem certeza da resposta e acha que
      os outros não têm — se todo mundo acertar, você ajudou o grupo de graça.
      Fecha também uma lacuna do docs/conhecimento-e-poder.md, que descreve o poder mas
      marca o efeito como não documentado.
      **Números:** dobra só o acerto base (100 vira 200). O bônus de velocidade não dobra,
      senão uma pergunta valeria 400 e uma rodada sozinha decidiria a partida.
      Disponível só **2 vezes na partida inteira**: uma na rodada 2 e outra na rodada 4,
      a penúltima antes da Pirâmide.
      Em aberto: o que significa "não vai aparecer para todos".

- [ ] **Pedágio (novo).** Não mexe na tela do alvo. Se o alvo acertar, uma fatia dos
      pontos daquela pergunta vai para quem usou o poder. Muda o alvo preferencial: você
      mira em quem está indo bem, não em quem está em dúvida.
      **Números:** leva **metade dos pontos que o alvo fizer**, e cada jogador pode usar
      **2 vezes na partida inteira**. O alvo descobre na revelação.
      A confirmar: "pontos da rodada" foi entendido como os pontos daquela pergunta. Se
      a ideia era metade do que ele somou na rodada inteira (3 perguntas), muda muito.

- [ ] **Aposta (novo).** O jogador aposta que o alvo vai errar. Se errar, ganha pontos;
      se acertar, perde. Também fecha lacuna do docs/, que lista o poder sem o efeito.
      **Números:** o jogador aposta **a favor** do alvo. Se o alvo **acertar**, ganha
      **+75**; se o alvo **errar**, perde **−50**. O alvo não sabe que foi apostado, senão
      mudaria o comportamento dele. Isso inverte o sentido do poder: em vez de torcer
      contra alguém, você escolhe em quem confia — e mirar em quem sabe muito é o jogo.
      Ideia de tela: é o único poder que não se resolve na hora, então o dado pode ficar
      girando no pod do alvo até a revelação da pergunta — um segundo ato só dele.

---

## Estrutura da partida

- [ ] **5 temas de 3 perguntas, em vez de 3 temas de 3.** Hoje `totalRodadas: 3` e
      `perguntasPorRodada: 3` (server/sala.js:20-21) dão 9 perguntas por partida. Passa
      para 5 rodadas de 3, ou seja 15 perguntas, e depois vem a Pirâmide.
      O banco aguenta: são 344 perguntas, 43 por tema nos 8 temas, e a partida usaria 5
      dos 8 temas mais o que a Pirâmide sortear.
      **Em aberto:** o que acontece com a Ligação e a Classificação, que hoje ficam entre
      a última pergunta e a Pirâmide. Saem da partida ou continuam?
      **Efeito no tempo de jogo:** cada pergunta custa hoje 53s fixos (10s de escolha de
      poder + 20s de alvo + 8s de leitura + 15s de resposta), mais a revelação e mais a
      animação nova do passo 5 (até 16s). Com 15 perguntas em vez de 9, a partida sai de
      uns 15 minutos para uns 25. Vale saber antes de testar com gente na sala.

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

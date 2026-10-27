# Manual do Domínio pelo Saber

Este manual tem duas partes.

A **Parte 1** é o resumo do que mudou nesta versão do jogo, para quem já conhecia o
projeto.

A **Parte 2** explica o jogo do zero, para quem nunca ouviu falar dele.

O que ainda falta fazer está no [upgrade_a_fazer.md](upgrade_a_fazer.md).

---

# Parte 1 — O que mudou nesta versão

## A partida fica maior e mais difícil no fim

Eram 3 temas de 3 perguntas, e no fim uma Ligação e uma Classificação antes da
Pirâmide. Agora:

| | Antes | Agora |
|---|---|---|
| Temas | 3 | **5** |
| Perguntas | 9 | **15** |
| Desafios (Ligação/Classificação) | 2, juntos no fim | **5, um depois de cada tema** |
| Duração estimada | ~15 min | ~27 min |
| Fases de escolha de poder | 1 por pergunta (15) | **10, só na 2ª e 3ª de cada tema** |

Os temas têm **nível fixo e crescente**: 2 fáceis, 2 médios e 1 difícil. As 3
perguntas de um tema saem todas do nível daquele tema.

Os desafios alternam: Ligação, Classificação, Ligação, Classificação, Ligação. São 3
Ligações e 2 Classificações por partida.

## Dois problemas de conteúdo que isso revela

**O nível difícil estava quase vazio.** O campo `dificuldade` existia nas 344 perguntas,
mas o servidor não usava. Quando passou a usar, o buraco apareceu: só 28 perguntas
difíceis no acervo inteiro, com Esportes tendo 1 e Cinema e TV tendo 2 — nenhum dos dois
conseguia montar uma rodada difícil, e o tema 5 sempre caía nos mesmos seis assuntos.

O acervo foi para **470 perguntas**, com 28 fáceis e 12 difíceis em cada tema:

| | fácil | médio | difícil |
|---|---|---|---|
| Antes | 166 | 150 | **28** |
| Agora | 224 | 150 | **96** |

Com 12 difíceis por tema, os oito temas disputam a rodada difícil em pé de igualdade.

**Os desafios se repetiam.** Existem 6 conjuntos de Ligação e 6 de Classificação, e o
sorteio não tinha memória: com 5 desafios por partida, a chance de repetir um dentro da
mesma partida era de **91%**. Agora o sorteio não repete conjunto na mesma partida, mas
ainda falta escrever mais conjuntos, senão toda partida mostra quase todo o acervo.

## Os Jogos de Poder são refeitos

Saem dois poderes e entram quatro. A lista final tem seis.

### Saem

| Poder | Por quê |
|---|---|
| **Gosma** | Nunca teve comportamento próprio: caía no mesmo contador de toques do Congelamento. A ideia de limpar com o dedo nunca chegou a existir |
| **Bombolha** | Bolhas em posição aleatória, no mesmo painel que cobre tudo |

### Ficam, um deles mudado

| Poder | O que faz |
|---|---|
| **Congelamento** 🧊 | **Mudou.** Era um painel único cobrindo as 4 respostas, com 3 toques para liberar tudo. Agora é **um bloco de gelo em cada alternativa**, 2 toques cada (+1 por ataque acumulado). Quem já decidiu paga menos que antes; quem está em dúvida paga mais |
| **Mordicadores** 😬 | Come as letras das alternativas do alvo, 20% por ataque, até 70% |

### Entram

| Poder | O que faz |
|---|---|
| **Névoa** 🌫️ | As alternativas do alvo aparecem borradas e clareiam em 5s. Cada ataque acumulado soma 1s. O borrão não aumenta — se aumentasse, dois ataques deixariam a tela ilegível e a resposta viraria sorte |
| **Escudo** 🛡️ | Em vez de atacar, você se protege: anula todos os ataques daquela pergunta. **3 por partida** |
| **Festa de Pontos** 🎉 | Todo mundo que acertar aquela pergunta ganha o dobro — adversários inclusive. Só existe **2 vezes na partida**, no tema 2 e no tema 4 |
| **Aposta** 🎲 | Você aposta **a favor** do alvo: +75 se ele acertar. Se errar, nada acontece — a Aposta só acrescenta. Ele não fica sabendo. **3 por partida** |

**Princípio que vale para todos:** o poder é escolhido e resolvido **por pergunta**, nunca
por tema. O que um poder tira, dá ou dobra se refere sempre aos pontos daquela pergunta.

## Uma tela nova entre a escolha e a pergunta

Depois que todos escolhem o poder e o alvo, e antes da pergunta aparecer, a TV mostra
**quem atacou quem** — só para descontrair.

Na ordem em que os jogadores entraram na sala, cada um aparece usando seu poder: um
projétil sai do pod de quem atacou e acerta o pod do alvo. Quem está de Escudo rebate o
ataque, que perde força e cai da tela.

São **2 segundos por jogador que usou poder** (teto de 16s com os 8 atacando). Enquanto
isso, o celular de todo mundo mostra **"Olhe para a TV"** no centro — senão a mesa fica
olhando para a mão no momento feito para rir junto.

Terminada a sequência, o jogo segue normal e a pergunta aparece.

## A Pirâmide muda de tamanho e de regra

| | Antes | Agora |
|---|---|---|
| Tamanho | 10 degraus | **8 andares** |
| Largada | Pelo **lugar** no placar | Pelos **pontos** |
| 1º lugar precisa de | 2 acertos | **4 acertos** |
| Último precisa de | 10 acertos | **8 acertos** |

Antes, quem liderava por 10 pontos largava igual a quem liderava por 1000 — a pontuação
não entrava na conta, só a ordem de chegada. E a vantagem era brutal: 2 acertos contra 10.

A largada agora é calculada assim:

```
MAX_PULOS = 4     // ninguém larga mais que 4 níveis acima da base
MENOR = menor pontuação da sala
MAIOR = maior pontuação da sala

para cada jogador:
  tPontos = (pontos - MENOR) / (MAIOR - MENOR)
  tLugar  = (n - 1 - colocação) / (n - 1)
  t       = 0,5 × tPontos + 0,5 × tLugar
  pulos   = arredondar(MAX_PULOS × t^1,5)     // 0 a 4
  andar   = pulos                             // 0 = chão, 1 a 8 = andares
```

Metade do peso vem da colocação, não só dos pontos, por um motivo prático: com um líder
muito disparado, a normalização pura achatava todo o resto no mesmo nível. Simulando com
um primeiro lugar de 3400 contra um segundo de 2300, do 2º ao 8º largavam **todos
juntos**, apesar de 600 pontos separando eles.

---

# Parte 2 — O jogo, explicado do zero

> Daqui em diante, o jogo é descrito como vai ficar depois das mudanças da Parte 1.

## Do que se trata

O **Domínio pelo Saber** é um jogo de perguntas e respostas para jogar na sala de casa,
com todo mundo junto.

A televisão mostra o jogo, e **cada pessoa usa o próprio celular como controle**. Ninguém
precisa instalar nada: é só apontar a câmera para o QR code que aparece na TV e abrir o
link.

De **2 a 8 jogadores**. Todos na mesma rede Wi-Fi da casa.

A graça não é só saber a resposta. É que, antes de cada pergunta, você pode **sabotar** um
adversário — congelar a tela dele, embaçar as alternativas, comer as letras das
respostas. E ele pode fazer o mesmo com você.

## Como entrar

1. Alguém liga o aparelho que roda o jogo e abre a tela na TV
2. A TV mostra um **código de 4 letras** e um **QR code**
3. Cada pessoa escaneia o QR com o celular, digita o nome e escolhe um bicho
4. São 8 bichos, um por jogador: raposa, panda, sapo, leão, unicórnio, pinguim, polvo e
   tigre. Quem clicar primeiro fica com ele
5. A primeira pessoa que entrou é o **anfitrião** — só ela tem o botão de começar

Se o seu celular cair no meio da partida, você tem **1 minuto** para voltar. Seus pontos,
seu bicho e sua posição ficam guardados esperando.

## Como uma partida acontece

A partida tem **5 temas**. Cada tema é um bloco de 3 perguntas seguido de um desafio
diferente. No fim de tudo vem a Pirâmide, que decide o vencedor.

Os temas ficam mais difíceis conforme a partida avança: os dois primeiros são fáceis, os
dois seguintes são médios, e o último é difícil.

### Passo 1 — As portas

A TV mostra **4 portas**, cada uma com um tema de pergunta: Geografia, História, Games,
Música, o que for.

Cada pessoa escolhe a sua porta no celular, em **10 segundos**. Não precisa todo mundo
escolher a mesma — a porta mais votada é a que abre, e empate é resolvido por sorteio.

Uma vez na partida inteira, você pode **garantir a sua porta**: ela abre mesmo contra a
maioria. Serve para quando você é o único que sabe muito de um assunto.

### Passo 2 — Escolher o poder

Em **10 segundos**, você escolhe qual poder quer usar nesta pergunta, entre 4 opções: os
3 de ataque aparecem sempre, e o 4º é sorteado entre Escudo, Aposta e Festa de Pontos
(só entre os que você ainda pode usar). Se preferir guardar, toque em **Não usar poder**.

**Nem toda pergunta tem essa fase.** A primeira pergunta de cada tema abre limpa, sem
sabotagem — inclusive a primeira da partida inteira, quando ninguém tem pontos e não há
em quem mirar com critério. Os poderes entram na 2ª e na 3ª pergunta de cada tema.

### Passo 3 — Escolher o alvo

Em **20 segundos**, você escolhe em quem usar. Cada jogador aparece com o bicho, a
posição e os pontos, do líder para baixo. Mais de uma pessoa pode mirar na mesma vítima,
e **os efeitos se acumulam** — dois congelamentos pedem um toque a mais em cada gelo.
Escudo e Festa de Pontos não têm alvo: valem na hora em que você escolhe.

### Passo 4 — A TV mostra quem atacou quem

Todo mundo olha para a televisão. Um por um, na ordem em que entraram na sala, os
jogadores aparecem lançando seus poderes. Quem estava de Escudo rebate o ataque.

É o momento de rir e xingar o amigo. Dura 2 segundos por jogador que usou poder, e
enquanto isso o celular de todo mundo mostra **"Olhe para a TV"**. A Aposta aparece sem
dizer em quem foi: o alvo está olhando.

### Passo 5 — A pergunta

A pergunta aparece na TV e no celular, com 4 alternativas. Mas os botões ficam travados
por **8 segundos**: é o tempo de leitura, para ninguém sair no tapa antes de todo mundo
ter lido.

Depois disso, **15 segundos** para responder. Se você foi atacado, é agora que o problema
aparece: o gelo para quebrar, o borrão para esperar passar, as letras comidas.

**Você responde uma vez só.** Não tem segunda chance — essa só existe na Pirâmide.

### Passo 6 — O resultado

A TV revela a resposta certa, quem acertou e como ficou o placar: cada um ganha o seu
"+pontos" e as linhas trocam de lugar. Se teve Aposta, o placar mostra quem apostou em quem
e se rendeu. Todo mundo confirma no celular e a próxima pergunta começa.

### Passo 7 — O desafio do tema

Depois das 3 perguntas, vem um desafio de **30 segundos**:

- **Desafio de Ligação** — ligar pares que combinam. País com capital, cantor com música,
  autor com livro. Cada par certo vale pontos, e quem completa tudo rápido ganha bônus
- **Desafio de Classificação** — separar itens em dois grupos. Marvel ou DC, animal ou
  planta, time brasileiro ou europeu. Cada item certo vale pontos, sem bônus de velocidade

Os dois se alternam: Ligação no primeiro tema, Classificação no segundo, e assim por
diante.

Cada um joga no próprio celular, e a ordem das coisas muda de um celular para outro — não
adianta olhar o do vizinho. Enquanto isso, a TV mostra o desafio e os bichos de todo mundo,
cada um com o quanto já fez; quem termina acende na sua cor. No fim, a TV mostra o gabarito
e o placar, e o celular mostra o que **você** acertou: os pares que você ligou, ou onde você
pôs cada item.

## Como a pontuação funciona

| Situação | Pontos |
|---|---|
| Acertar uma pergunta | 100 |
| Bônus de velocidade | até 100 a mais |
| Cada par certo na Ligação | 40 |
| Completar a Ligação toda | até 100 de bônus |
| Cada item certo na Classificação | 25 |

**Acertar vem antes de ser rápido.** Quem erra não pontua, por mais rápido que tenha
respondido. A velocidade só desempata entre quem acertou.

## Os poderes

Na 2ª e na 3ª pergunta de cada tema, você escolhe um poder e, se ele pedir, um alvo.
São seis.

### Atrapalham a tela do adversário

| Poder | O que faz |
|---|---|
| **Congelamento** 🧊 | Cobre cada uma das 4 alternativas dele com um bloco de gelo. Ele precisa tocar 2 vezes para quebrar o gelo da resposta que quer (+1 toque por ataque acumulado), e o toque seguinte responde. Quem sabe a resposta paga barato; quem está em dúvida quebra vários |
| **Mordicadores** 😬 | Come as letras das alternativas dele: 20% por ataque, até 70%. Ainda dá para ler, mas devagar |
| **Névoa** 🌫️ | As alternativas dele ficam borradas e vão clareando em 5 segundos (+1s por ataque acumulado). O celular dele mostra o bônus de velocidade caindo. Ele decide: chutar agora no borrão, ou esperar enxergar e perder o bônus? |

### Mexem com os pontos, não com a tela

| Poder | O que faz |
|---|---|
| **Aposta** 🎲 | Você aposta a favor de alguém: +75 se ele acertar. Se errar, nada acontece. Ele nunca fica sabendo. Em vez de torcer contra, você escolhe em quem confia. **3 usos na partida** |

### Não atacam ninguém

| Poder | O que faz |
|---|---|
| **Escudo** 🛡️ | Anula todos os ataques que vierem contra você nesta pergunta. **3 usos na partida** |
| **Festa de Pontos** 🎉 | Todo mundo que acertar ganha o dobro — inclusive seus adversários. Vale quando você tem certeza e acha que os outros não têm. Se todo mundo acertar, você ajudou a mesa de graça. Só aparece **2 vezes na partida**, uma no tema 2 e outra no tema 4. O dobro vale só para o acerto: o bônus de velocidade não dobra |

## A Pirâmide do Conhecimento

É o final, e é onde tudo se decide.

**A pontuação acumulada deixa de valer para ganhar.** Ela só decide **onde você começa**.

A pirâmide tem 8 andares. Antes da corrida, a TV mostra os pontos de cada um virando o
andar de largada: quem fez mais pontos já larga alguns andares acima — no máximo no
andar 4. Quem ficou em último começa no chão.

Na prática: o primeiro colocado precisa de **4 respostas certas** para chegar ao topo, e o
último precisa de **8**. É vantagem de verdade, mas não é partida ganha.

A partir daí, todo mundo corre ao mesmo tempo, cada um no seu ritmo, com suas próprias
perguntas. **Cada acerto sobe um nível.**

E aqui está a diferença que muda tudo: **nessa fase você pode errar e tentar de novo.** A
alternativa errada fica marcada e você escolhe outra, até acertar. Errar não te derruba —
só custa tempo.

Por isso a Pirâmide não premia quem sabe mais. Premia quem **insiste mais rápido**.

Na TV, os bichos sobem de nível em nível enquanto a corrida acontece, e a mesa inteira vê
quem está prestes a chegar. **O primeiro que alcançar o topo vence a partida**, não
importa quantos pontos tenha feito até ali.

## O fim

A TV mostra o pódio: o 3º sobe, o 2º sobe, rufar, e o campeão sobe com coroa e confete.
Do 2º lugar em diante vale o andar alcançado; quem parou no mesmo andar é desempatado
pelos pontos das rodadas.

No celular, cada um vê a própria colocação, quem venceu (e se foi virada), e o placar das
rodadas com o caminho de cada um na pirâmide. O anfitrião tem o botão **Jogar de novo**,
que leva todo mundo de volta para a escolha dos bichos.

---

## Em uma frase

Cinco temas para fazer pontos sabotando os amigos, e uma corrida final onde os pontos
só decidem a sua vantagem de largada — não quem ganha.

# Manual do Domínio pelo Saber

Este manual tem duas partes.

A **Parte 1** é o resumo de tudo que foi decidido mudar no jogo, para quem já conhece o
projeto e quer saber o que vem pela frente.

A **Parte 2** explica o jogo do zero, para quem nunca ouviu falar dele. Ela descreve o
jogo **como vai ficar** depois das mudanças da Parte 1 — vários poderes e regras dali
ainda não existem no código.

A fila de implementação, com os detalhes técnicos de cada item, está no
[upgrade_a_fazer.md](upgrade_a_fazer.md). O trabalho acontece na branch `novos-poderes`.

---

# Parte 1 — O que vai mudar

## A partida fica maior e mais difícil no fim

Hoje são 3 temas de 3 perguntas, e no fim uma Ligação e uma Classificação antes da
Pirâmide. Passa a ser:

| | Hoje | Depois |
|---|---|---|
| Temas | 3 | **5** |
| Perguntas | 9 | **15** |
| Desafios (Ligação/Classificação) | 2, juntos no fim | **5, um depois de cada tema** |
| Duração estimada | ~15 min | ~30 min |

Os temas passam a ter **nível fixo e crescente**: 2 fáceis, 2 médios e 1 difícil. As 3
perguntas de um tema saem todas do nível daquele tema.

Os desafios alternam: Ligação, Classificação, Ligação, Classificação, Ligação. São 3
Ligações e 2 Classificações por partida.

## Dois problemas de conteúdo que isso revela

**O nível difícil está quase vazio.** O campo `dificuldade` já existe nas 344 perguntas,
mas o servidor nunca usou — ele filtra só por tema. Olhando o acervo:

| | fácil | médio | difícil |
|---|---|---|---|
| Total | 166 | 150 | **28** |

Um tema difícil precisa de 3 perguntas daquele nível. **Esportes tem 1 e Cinema e TV tem
2** — nenhum dos dois consegue montar uma rodada difícil. Ciência e Games têm exatamente
3, então cairiam sempre as mesmas. Só 4 dos 8 temas têm folga.

**Os desafios vão se repetir.** Existem 6 conjuntos de Ligação e 6 de Classificação, e o
sorteio deles não tem memória nenhuma — diferente das perguntas, que já evitam repetição.
Com 5 desafios por partida saindo de 6 conjuntos sorteados às cegas, a chance de repetir
dentro da mesma partida é de **91%**.

A correção no código é pequena: passar a lista de usados, igual já é feito com as
perguntas. Mas depois disso ainda falta escrever mais conjuntos, senão toda partida
mostra quase todo o acervo.

## Os Jogos de Poder são refeitos

Saem dois poderes e entram três. A lista final tem sete.

### Saem

| Poder | Por quê |
|---|---|
| **Gosma** | Nunca teve comportamento próprio: caía no mesmo contador de toques do Congelamento. A ideia de limpar com o dedo nunca chegou a existir |
| **Bombolha** | Bolhas em posição aleatória, no mesmo painel que cobre tudo |

### Ficam, um deles mudado

| Poder | O que faz |
|---|---|
| **Congelamento** 🧊 | **Muda.** Hoje é um painel único cobrindo as 4 respostas, com 3 toques para liberar tudo. Passa a ser **um bloco de gelo em cada alternativa**, 2 toques cada. Quem já decidiu paga menos que hoje; quem está em dúvida paga mais |
| **Mordicadores** 😬 | Come as letras das alternativas do alvo, 20% por ataque, até 70% |

### Entram

| Poder | O que faz |
|---|---|
| **Névoa** 🌫️ | As alternativas do alvo aparecem borradas e clareiam em 5s. Cada ataque acumulado soma 1s. O borrão não aumenta — se aumentasse, dois ataques deixariam a tela ilegível e a resposta viraria sorte |
| **Escudo** 🛡️ | Em vez de atacar, você se protege: anula todos os ataques daquela pergunta. **3 por partida** |
| **Festa de Pontos** 🎉 | Todo mundo que acertar aquela pergunta ganha o dobro — adversários inclusive. Só existe **2 vezes na partida**, no tema 2 e no tema 4 |
| **Pedágio** 💰 | Não mexe na tela do alvo. Se ele acertar, metade dos pontos daquela pergunta vai para você. **2 por partida** |
| **Aposta** 🎲 | Você aposta **a favor** do alvo: +75 se ele acertar, −50 se errar. Ele não fica sabendo. **3 por partida** |

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

| | Hoje | Depois |
|---|---|---|
| Tamanho | 10 degraus | **8 níveis** |
| Largada | Pelo **lugar** no placar | Pelos **pontos** |
| 1º lugar precisa de | 2 acertos | **3 acertos** |
| Último precisa de | 10 acertos | **7 acertos** |

Hoje quem lidera por 10 pontos larga igual a quem lidera por 1000 — a pontuação não entra
na conta, só a ordem de chegada. E a vantagem é brutal: 2 acertos contra 10.

A largada passa a ser calculada assim:

```
MAX_PULOS = 4     // ninguém larga mais que 4 níveis acima da base
MENOR = menor pontuação da sala
MAIOR = maior pontuação da sala

para cada jogador:
  tPontos = (pontos - MENOR) / (MAIOR - MENOR)
  tLugar  = (n - 1 - colocação) / (n - 1)
  t       = 0,5 × tPontos + 0,5 × tLugar
  pulos   = arredondar(MAX_PULOS × t^1,5)     // 0 a 4
  nível   = pulos                             // 0 = base, 7 = topo
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
adversário — congelar a tela dele, embaçar as alternativas, roubar os pontos que ele
fizer. E ele pode fazer o mesmo com você, sem você saber.

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

Em **10 segundos**, você escolhe qual poder quer usar nesta pergunta. Ou nenhum, se
preferir guardar.

### Passo 3 — Escolher o alvo

Em **20 segundos**, você escolhe em quem usar. Mais de uma pessoa pode mirar na mesma
vítima, e **os efeitos se acumulam** — dois congelamentos valem o dobro de toques.

### Passo 4 — A TV mostra quem atacou quem

Todo mundo olha para a televisão. Um por um, na ordem em que entraram na sala, os
jogadores aparecem lançando seus poderes. Quem estava de Escudo rebate o ataque.

É o momento de rir e xingar o amigo. Dura 2 segundos por atacante.

### Passo 5 — A pergunta

A pergunta aparece na TV e no celular, com 4 alternativas. Mas os botões ficam travados
por **8 segundos**: é o tempo de leitura, para ninguém sair no tapa antes de todo mundo
ter lido.

Depois disso, **15 segundos** para responder. Se você foi atacado, é agora que o problema
aparece: o gelo para quebrar, o borrão para esperar passar, as letras comidas.

**Você responde uma vez só.** Não tem segunda chance — essa só existe na Pirâmide.

### Passo 6 — O resultado

A TV revela a resposta certa, quem acertou e como ficou o placar. Todo mundo confirma no
celular e a próxima pergunta começa.

### Passo 7 — O desafio do tema

Depois das 3 perguntas, vem um desafio de **30 segundos**:

- **Desafio de Ligação** — ligar pares que combinam. País com capital, cantor com música,
  autor com livro. Cada par certo vale pontos, e quem completa tudo rápido ganha bônus
- **Desafio de Classificação** — separar itens em dois grupos. Marvel ou DC, animal ou
  planta, time brasileiro ou europeu. Cada item certo vale pontos, sem bônus de velocidade

Os dois se alternam: Ligação no primeiro tema, Classificação no segundo, e assim por
diante.

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

Antes de cada pergunta, você escolhe um poder e uma vítima. São sete.

### Atrapalham a tela do adversário

| Poder | O que faz |
|---|---|
| **Congelamento** 🧊 | Cobre cada uma das 4 alternativas dele com um bloco de gelo. Ele precisa tocar 2 vezes para quebrar o gelo da resposta que quer. Quem sabe a resposta paga barato; quem está em dúvida quebra vários |
| **Mordicadores** 😬 | Come as letras das alternativas dele. Ainda dá para ler, mas devagar |
| **Névoa** 🌫️ | As alternativas dele ficam borradas e vão clareando em 5 segundos. Ele decide: chutar agora no borrão, ou esperar enxergar e perder o bônus de velocidade? |

### Mexem com os pontos, não com a tela

| Poder | O que faz |
|---|---|
| **Pedágio** 💰 | Se o alvo acertar, metade dos pontos dele vai para você. Você mira em quem está indo bem, não em quem está perdido. **2 usos na partida** |
| **Aposta** 🎲 | Você aposta a favor de alguém: +75 se ele acertar, −50 se errar. Ele nunca fica sabendo. Em vez de torcer contra, você escolhe em quem confia. **3 usos na partida** |

### Não atacam ninguém

| Poder | O que faz |
|---|---|
| **Escudo** 🛡️ | Anula todos os ataques que vierem contra você nesta pergunta. **3 usos na partida** |
| **Festa de Pontos** 🎉 | Todo mundo que acertar ganha o dobro — inclusive seus adversários. Vale quando você tem certeza e acha que os outros não têm. Se todo mundo acertar, você ajudou a mesa de graça. Só aparece **2 vezes na partida** |

## A Pirâmide do Conhecimento

É o final, e é onde tudo se decide.

**A pontuação acumulada deixa de valer para ganhar.** Ela só decide **onde você começa**.

A pirâmide tem 8 níveis. Quem fez mais pontos começa mais perto do topo — no máximo 4
níveis acima da base. Quem ficou em último começa lá embaixo.

Na prática: o primeiro colocado precisa de **3 respostas certas** para chegar ao topo, e o
último precisa de **7**. É vantagem de verdade, mas não é partida ganha.

A partir daí, todo mundo corre ao mesmo tempo, cada um no seu ritmo, com suas próprias
perguntas. **Cada acerto sobe um nível.**

E aqui está a diferença que muda tudo: **nessa fase você pode errar e tentar de novo.** A
alternativa errada fica marcada e você escolhe outra, até acertar. Errar não te derruba —
só custa tempo.

Por isso a Pirâmide não premia quem sabe mais. Premia quem **insiste mais rápido**.

Na TV, os bichos sobem de nível em nível enquanto a corrida acontece, e a mesa inteira vê
quem está prestes a chegar. **O primeiro que alcançar o topo vence a partida**, não
importa quantos pontos tenha feito até ali.

---

## Em uma frase

Cinco rodadas para fazer pontos sabotando os amigos, e uma corrida final onde os pontos
só decidem a sua vantagem de largada — não quem ganha.

# Domínio pelo Saber

Jogo de quiz para jogar na sala de casa: a **TV** (ou um notebook ligado nela) mostra o jogo, e cada pessoa usa o **próprio celular como controle**. De 2 a 8 jogadores, todos na mesma rede Wi-Fi.

É uma recriação caseira do *Knowledge is Power* (PS4/PlayLink) — a mecânica original que serviu de base está documentada em [docs/conhecimento-e-poder.md](docs/conhecimento-e-poder.md).

---

## O que você precisa

- **Node.js 18 ou mais novo** (testado no 24) — [nodejs.org](https://nodejs.org)
- Um computador para ser o servidor (pode ser um Raspberry Pi, um notebook, qualquer coisa)
- Uma tela grande com navegador — a TV, ou o notebook ligado na TV por HDMI
- 2 a 8 celulares, **todos na mesma rede Wi-Fi do servidor**

Nada é instalado além das dependências do servidor. Não precisa de internet durante a partida (só a fonte de texto é baixada da web; sem internet o jogo funciona igual, só muda a tipografia).

---

## Como rodar

### 1. Instalar as dependências (só na primeira vez)

```bash
cd server
npm install
```

### 2. Ligar o servidor

```bash
npm start
```

O console mostra algo assim:

```
Sala criada com o código: REKM
Servidor rodando em http://localhost:3000
TV:         http://localhost:3000/tv
Controle:   http://localhost:3000/controlador
Na rede:    http://192.168.18.201:3000/controlador?codigo=REKM
```

Guarde o **código da sala** (4 letras) e a linha **`Na rede:`** — é esse endereço que os celulares vão abrir.

### 3. Abrir a TV

No navegador da tela grande, abra:

```
http://localhost:3000/tv
```

Se a TV for outro aparelho, use o IP em vez de `localhost` (ex.: `http://192.168.18.201:3000/tv`).

A tela de lobby mostra o código da sala e um **QR code** com o link do controle.

### 4. Entrar com os celulares

Cada jogador faz uma das duas coisas:

- **Escanear o QR code** que está na TV (já entra com o código preenchido), ou
- Digitar na mão o endereço da linha `Na rede:` do console

Depois é só **digitar o nome** e o **código da sala**, e **escolher um animal** (cada animal é de um jogador só — são 8).

### 5. Começar

O **primeiro jogador que entrou é o anfitrião**: só ele tem o botão de iniciar a partida. Precisa de no mínimo 2 jogadores, e todos têm que ter escolhido um animal.

---

## Usar outra porta

A porta padrão é a 3000. Para mudar:

```powershell
# Windows (PowerShell)
$env:PORTA = 8080; npm start
```

```bash
# Linux, macOS, Git Bash
PORTA=8080 npm start
```

---

## Como é uma partida

| Fase | O que acontece |
|---|---|
| **3 rodadas × 3 perguntas** | Cada rodada abre com 4 portas de temas; a mais votada vence. Antes de cada pergunta, dá para usar um **Jogo de Poder** para sabotar a tela de outro jogador. |
| **Desafio de Ligação** | Ligar pares relacionados (país ↔ capital, por exemplo) contra o tempo. |
| **Desafio de Classificação** | Separar itens entre duas categorias (Marvel ou DC, por exemplo). |
| **Pirâmide do Conhecimento** | Finale de 10 degraus. A pontuação acumulada só define a largada: quem está na frente começa mais perto do topo. Cada acerto sobe um degrau, quem chega ao topo primeiro vence — e aqui dá para errar e tentar de novo. |

Detalhes úteis na hora de jogar:

- **Poderes de sabotagem:** Congelamento, Gosma, Bombolha e Mordicadores. Vários jogadores podem mirar a mesma pessoa, e os efeitos se acumulam.
- **Garantir a porta:** cada jogador pode, **uma única vez na partida**, forçar a abertura da sua porta mesmo contra a maioria.
- **Caiu a conexão?** O celular volta sozinho para o mesmo lugar, com pontos e animal, se reconectar em até **1 minuto**. Depois disso o jogador é removido da partida.
- **No fim da partida**, só o anfitrião pode reiniciar ou levar todos de volta ao lobby. Se o anfitrião sair, outra pessoa assume automaticamente.

---

## Rodar os testes

```bash
cd server
npm test
```

São 123 testes do motor do jogo (sala, placar, poderes, reconexão, partida completa). Levam cerca de 1min30, porque alguns esperam timers reais.

---

## Estrutura do projeto

```
server/            servidor Node (HTTP + WebSocket) e todo o motor do jogo
  index.js         liga o servidor, descobre o IP da rede local
  app.js           rotas, WebSocket, roteamento das mensagens
  sala.js          o jogo: estados, rodadas, pontuação, poderes
  tests/           testes automatizados
public/tv/         tela da TV (o que todos olham)
public/controlador/ tela do celular (o controle de cada jogador)
data/              banco de conteúdo: perguntas, ligações, classificações
docs/              documentação da mecânica original do jogo
design/            protótipos de tela (não entram na partida)
upgrade_a_fazer.md fila de mudanças planejadas do projeto
```

---

## Adicionar ou editar perguntas

Tudo fica em [data/](data/), em JSON. Os arquivos são lidos a cada sorteio, então **não precisa reiniciar o servidor** depois de editar — só não vale mexer no meio de uma partida.

**[data/perguntas.json](data/perguntas.json)** — 344 perguntas em 8 temas (Geografia, História, Ciência e Natureza, Esportes, Cinema e TV, Música, Games, Arte e Literatura):

```json
{
  "id": 1,
  "categoria": "Geografia",
  "dificuldade": "facil",
  "pergunta": "Qual é o maior país do mundo em extensão territorial?",
  "resposta_correta": "Rússia",
  "alternativas_erradas": ["Canadá", "China", "Estados Unidos"]
}
```

**[data/associacoes.json](data/associacoes.json)** — conjuntos do Desafio de Ligação (5 pares cada):

```json
{
  "id": 1,
  "tema": "Capitais e Países",
  "pares": [{ "esquerda": "Brasil", "direita": "Brasília" }]
}
```

**[data/classificacoes.json](data/classificacoes.json)** — conjuntos do Desafio de Classificação (`"A"` ou `"B"` diz a qual categoria o item pertence):

```json
{
  "id": 1,
  "categoriaA": "Marvel",
  "categoriaB": "DC",
  "itens": [{ "nome": "Homem-Aranha", "categoria": "A" }]
}
```

Use um `id` novo em cada item que adicionar, e mantenha exatamente **3 alternativas erradas** por pergunta — o jogo monta 4 opções embaralhadas a partir disso.

---

## Quando algo dá errado

**O QR code não aparece na TV** — o console avisou `Não achei um IP de rede local`. Acontece quando o servidor não tem conexão de rede ativa (só loopback). Conecte o computador ao Wi-Fi ou ao cabo e reinicie o servidor; enquanto isso, dá para entrar digitando o endereço na mão.

**O celular não abre o endereço** — confira os três suspeitos, nesta ordem:
1. O celular está na **mesma rede** do servidor? Rede de visitantes normalmente não enxerga os outros aparelhos.
2. O **firewall do Windows** está bloqueando o Node? Na primeira execução aparece um aviso pedindo permissão — é preciso liberar para "redes privadas".
3. Alguns roteadores têm **isolamento de clientes** (*AP isolation*) ligado, o que impede um aparelho de falar com o outro. Precisa desligar nas configurações do roteador.

**"Código da sala inválido"** — o código muda a cada vez que o servidor é reiniciado. Confira o código que está na TV agora.

**"A partida já começou"** — não dá para entrar com a partida rolando. O anfitrião pode voltar todos ao lobby no fim da partida, e aí o novo jogador entra.

**"Sala cheia"** — o limite é 8 jogadores, um por animal.

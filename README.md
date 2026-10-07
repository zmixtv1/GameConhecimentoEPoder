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

---

## Rodar no Raspberry Pi

O Pi é o lugar natural desse jogo: fica ligado atrás da TV e nunca mais precisa de atenção. E a instalação é leve — o servidor tem 97 dependências, **todas JavaScript puro**, sem nenhum pacote que precise compilar. Não existe aqui aquela espera de 20 minutos compilando pacote nativo no ARM.

**Modelos que funcionam:** Pi 2, 3, 4, 5 e Zero 2 W. Pi 1, Pi Zero e Zero W originais são ARMv6, arquitetura que o Node.js não distribui mais oficialmente — dariam bastante trabalho.

### Antes de tudo: pôr o Pi na rede

O jogo inteiro depende disso — é por essa rede que os celulares chegam na partida. E sem rede não dá nem para clonar o repositório.

**O jeito mais fácil é configurar antes do primeiro boot**, na hora de gravar o cartão SD. No Raspberry Pi Imager, depois de escolher o sistema e o cartão, clique na engrenagem (ou em "Editar definições") e preencha:

- Nome da rede Wi-Fi e senha
- **País do Wi-Fi: BR** — não pule esse campo, explicado logo abaixo
- Nome de usuário e senha
- Hostname (sugestão: `dominio`, que vira o endereço `dominio.local`)
- SSH ligado, se quiser administrar o Pi de outro computador depois

O Pi já liga conectado, sem precisar de teclado para a parte de rede.

**Se o Pi já está ligado na TV**, é mais simples ainda: clique no ícone de rede no canto superior direito da área de trabalho, escolha o Wi-Fi e digite a senha. Uma vez só — ele reconecta sozinho em todo boot.

**Pelo terminal**, se preferir:

```bash
nmcli device wifi list                                   # ver as redes por perto
sudo nmcli device wifi connect "NOME-DA-REDE" password "senha"
```

Ou `sudo raspi-config` → System Options → Wireless LAN, que também pergunta o país.

#### Dois detalhes que travam muita gente

**O país do Wi-Fi é obrigatório.** Sem ele o rádio fica bloqueado por software e o Pi simplesmente não enxerga rede nenhuma — sem mensagem de erro que ajude. Se o Wi-Fi "não funciona" e nem lista redes, é quase sempre isso: `sudo raspi-config` → Localisation Options → WLAN Country → BR.

**Instrução antiga que não funciona mais:** muito tutorial manda criar um `wpa_supplicant.conf` na partição de boot do cartão SD pelo Windows. Isso valia até o Raspberry Pi OS Bullseye. Do Bookworm em diante, quem cuida da rede é o NetworkManager e esse arquivo é ignorado. Use o Imager ou o `nmcli`.

#### Cabo também serve

Se o Pi ficar perto do roteador, o cabo de rede é mais estável e dispensa configuração — basta plugar. Os celulares continuam no Wi-Fi normalmente, porque é o mesmo roteador.

Só não deixe **cabo e Wi-Fi ligados ao mesmo tempo**: o servidor escolhe o primeiro IP que encontra ([index.js:12](server/index.js#L12)) e pode anunciar no QR code a interface errada. Escolha uma das duas.

#### E se não houver Wi-Fi no lugar?

Para levar o jogo a um lugar sem rede, o Pi pode criar a própria:

```bash
sudo nmcli device wifi hotspot ssid DominioPeloSaber password umasenhaboa
```

Os celulares entram nessa rede e jogam normalmente. O porém: sem internet nessa conexão, o Android costuma avisar que "a rede não tem acesso à internet" e pode querer voltar para os dados móveis — alguém vai precisar mandar o celular continuar conectado. Para uso em casa, entrar no Wi-Fi normal é bem menos atrito.

### Instalação

Com o Pi ligado na TV por HDMI, rode no próprio Pi:

```bash
git clone https://github.com/zmixtv1/GameConhecimentoEPoder.git
cd GameConhecimentoEPoder
./raspberry-pi/instalar.sh
sudo reboot
```

Rode **sem `sudo`** — o script pede sozinho onde precisa. Rodar tudo como root instalaria o modo quiosque na casa do root, e ele não abriria na sua sessão.

### O que você ganha com isso

Depois do reboot, **ligar o Pi na tomada já põe o jogo na TV**. Sem teclado, sem SSH, sem abrir navegador. A tela sobe mostrando o código da sala e o QR code; os celulares escaneiam e entram.

Se faltar luz no meio da festa, o Pi religa e o jogo volta sozinho. Se o servidor travar, o systemd reinicia em 5 segundos.

O script faz seis coisas:

| Etapa | Por quê |
|---|---|
| Instala o Node.js 22 (se preciso) | O Node do `apt` do Raspberry Pi OS costuma ser velho demais para o jogo |
| Cria o serviço `dominio-pelo-saber` | Sobe no boot e reinicia sozinho se cair |
| Configura o modo quiosque | O Chromium abre a tela da TV em tela cheia no boot, com perfil separado para não aparecer "o Chromium não foi encerrado corretamente" por cima do jogo |
| Desliga o apagamento de tela | Senão a TV apaga no meio da partida |
| Desliga a economia de energia do Wi-Fi | O rádio do Pi dorme entre pacotes por padrão, somando atraso e instabilidade justamente num jogo que dá bônus por velocidade |
| Instala o gancho de troca de rede | Faz o QR code aparecer sozinho quando o Pi entra num Wi-Fi novo, sem precisar de terminal |

### Levando o Pi para outra casa

Resposta curta: **o jogo abre na TV sozinho, sim — mas ninguém consegue entrar até o Pi estar no Wi-Fi do lugar.**

O que acontece exatamente quando você chega numa casa nova e liga o Pi:

1. O servidor sobe normalmente. Ele não depende de rede para funcionar.
2. O Chromium abre a tela da TV em tela cheia, porque usa `localhost` — funciona mesmo sem rede nenhuma.
3. A TV mostra o código da sala, mas **sem QR code**: o servidor não achou nenhum IP para colocar no link.
4. Os celulares não têm como chegar no jogo, porque o Pi não está em rede alguma.

Então falta um passo, e ele é na área de trabalho:

1. **`Alt+F4`** fecha a tela cheia e revela a área de trabalho.
2. Clique no ícone de rede, escolha o Wi-Fi da casa e digite a senha.
3. **O jogo se reinicia sozinho** e passa a mostrar o QR code — quem cuida disso é o [rede-mudou.sh](raspberry-pi/rede-mudou.sh), instalado como gancho do NetworkManager.
4. Abra **"Domínio pelo Saber (TV)"**, o atalho que o instalador deixa na área de trabalho, para voltar à tela cheia.

Da segunda vez em diante naquela casa não precisa de nada: o Pi já guardou a rede e liga conectado.

#### Por que o reinício é automático mas não atrapalha

Reiniciar o servidor gera um código de sala novo e derruba quem estiver jogando — seria péssimo se acontecesse no meio de uma partida porque o Wi-Fi oscilou.

Por isso o gancho não reinicia sempre. Ele olha o log da execução atual do serviço e só age se o jogo **tiver subido sem IP**. Se a partida começou com rede normal e o Wi-Fi apenas piscou, nada acontece. Se o jogo subiu sem IP, não havia QR code nem jogador conectado, então reiniciar não custa nada a ninguém.

Se preferir não depender disso, um `sudo reboot` depois de entrar no Wi-Fi resolve igual.

### Comandos do dia a dia

```bash
sudo systemctl status dominio-pelo-saber     # está no ar?
sudo systemctl restart dominio-pelo-saber    # reinicia e gera um código de sala novo
sudo journalctl -u dominio-pelo-saber -f     # acompanhar ao vivo
```

Para atualizar o jogo depois de mudanças no repositório:

```bash
cd ~/GameConhecimentoEPoder
git pull
cd server && npm install
sudo systemctl restart dominio-pelo-saber
```

### Detalhe de rede

O servidor descobre o IP da máquina **uma única vez, ao iniciar**, para montar o link do QR code. Num boot do Pi, o systemd normalmente chega lá antes de o Wi-Fi associar — por isso o serviço espera até 30 segundos por um IP antes de subir ([esperar-rede.sh](raspberry-pi/esperar-rede.sh)). Passados os 30s ele sobe mesmo assim: melhor um jogo no ar sem QR code, com o código digitado na mão, do que nenhum jogo.

Um aviso para quem usa cabo e Wi-Fi ao mesmo tempo: o servidor pega o primeiro IPv4 que encontra ([index.js:12](server/index.js#L12)). Com `eth0` e `wlan0` ativos juntos, ele pode anunciar no QR code o IP do cabo enquanto os celulares estão no Wi-Fi. Se isso acontecer, deixe só uma das duas conexões ativa.

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
raspberry-pi/      instalação como serviço no Pi (serviço, quiosque, instalador)
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

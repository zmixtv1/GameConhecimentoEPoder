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

**Decisão em aberto que vale para o conjunto todo:** hoje cada jogador escolhe um
poder em toda pergunta. Se Escudo e Festa de Pontos custarem o mesmo que atacar,
ninguém ataca mais. Definir se esses dois são de **uso único na partida** (como já
é o poder de garantir a porta, controlado por `jogadoresQueUsaramPoderPorta` em
server/sala.js) ou se têm outro custo.

Onde os poderes vivem hoje: `TIPOS_DE_PODER` em server/sala.js:13, `POR_TIPO` em
public/controlador/controlador.js:12 e `montarObstrucao()` em
public/controlador/controlador.js:1038.

- [ ] **Tela de "quem atacou quem" na TV.** Entra como fase nova entre
      `_resolverEscolhaAlvo()` e a leitura da pergunta, com o único objetivo de
      descontrair: a TV mostra, na ordem em que os jogadores entraram na sala
      (`this.jogadores` é um Map, então já itera nessa ordem), cada jogador usando
      seu poder — um projétil sai do pod de quem atacou e acerta o pod do alvo.
      Terminada a sequência, o jogo segue normal e mostra a pergunta como hoje.
      **Tempo: 2 segundos por jogador que usou poder** (quem não escolheu poder não
      ganha um momento). Teto de 16s com os 8 atacando, mas o caso comum é bem menor.
      Protótipo visual pronto em `teste-poderes.html`, com o dicionário `PODERES`
      classificando cada um em `ataque | defesa | global` — essa classificação deve
      ir junto para o servidor.
      Quatro coisas que o protótipo ainda não resolve e a versão real precisa:
      1. Ele posiciona dois pods nas laterais com `justify-content: space-between`.
         O jogo tem de 2 a 8 jogadores, então precisa virar grade ou arco.
      2. `limparTodosStatus()` zera os efeitos a cada poder novo. No jogo os efeitos
         **acumulam** (`efeitosAtivos` é um array por alvo), então a sequência deve ir
         empilhando e terminar mostrando o estado final de todo mundo.
      3. A Névoa borra o nome do jogador junto com o avatar. Na TV o nome precisa
         continuar legível — borrar só o avatar, ou pôr a névoa por cima do pod.
      4. Na cena do escudo o protótipo revela a defesa antes de o ataque sair. Mais
         forte ao contrário: o ataque voa, e o escudo só se revela no impacto.

- [ ] **Remover Gosma e Bombolha.** A Gosma nunca teve comportamento próprio: cai no
      mesmo contador de toques do Congelamento (`e.tipo === "congelamento" || e.tipo === "gosma"`),
      então a ideia de limpar com o dedo nunca existiu. A Bombolha tinha código próprio
      (bolhas em posição aleatória) mas no mesmo painel que cobre tudo. Tirar os dois de
      `TIPOS_DE_PODER`, de `POR_TIPO` e de `montarObstrucao()`.

- [ ] **Congelamento: um gelo em cada alternativa.** Hoje um painel único cobre as 4
      respostas e 3 toques liberam todas de uma vez. Passa a ser um bloco de gelo por
      alternativa: o jogador quebra só o da resposta que quer. Quem sabe paga barato,
      quem está em dúvida paga caro, e dá para quebrar o gelo errado no susto.
      Definir: quantos toques por bloco, e se ataques acumulados somam toques no mesmo
      bloco ou congelam de novo o que já foi quebrado.

- [ ] **Névoa (novo).** As alternativas do alvo aparecem borradas e vão clareando ao
      longo de alguns segundos. Cria a decisão de chutar no borrão ou esperar enxergar e
      perder o bônus de velocidade. É filtro CSS, sem camada de obstrução.
      Definir: duração até limpar, e se ataques acumulados aumentam o borrão ou o tempo.

- [ ] **Escudo (novo).** Em vez de atacar, o jogador se protege: anula os poderes que
      vierem contra ele naquela pergunta. É o que mais muda o jogo, porque a fase de
      poder passa a ter duas decisões ("bato ou me defendo?") e quem está na frente
      ganha motivo real para se proteger. Na TV, cada ataque bloqueado ganha a animação
      de proteção (ver o item da tela acima).
      Definir: bloqueia um poder ou todos os que chegarem, e se é de uso único na partida.

- [ ] **Festa de Pontos (novo).** Todos que acertarem aquela pergunta ganham o dobro,
      inclusive os adversários. Vale usar quando você tem certeza da resposta e acha que
      os outros não têm — se todo mundo acertar, você ajudou o grupo de graça.
      Fecha também uma lacuna do docs/conhecimento-e-poder.md, que descreve o poder mas
      marca o efeito como não documentado.
      Definir: se dobra só o acerto base (100) ou também o bônus de velocidade.

- [ ] **Pedágio (novo).** Não mexe na tela do alvo. Se o alvo acertar, uma fatia dos
      pontos daquela pergunta vai para quem usou o poder. Muda o alvo preferencial: você
      mira em quem está indo bem, não em quem está em dúvida.
      Definir: a fatia (percentual ou valor fixo) e se o alvo fica sabendo na hora.

- [ ] **Aposta (novo).** O jogador aposta que o alvo vai errar. Se errar, ganha pontos;
      se acertar, perde. Também fecha lacuna do docs/, que lista o poder sem o efeito.
      Definir: quanto se ganha e quanto se perde, e se o alvo sabe que foi apostado.
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

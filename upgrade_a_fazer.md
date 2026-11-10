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

## Confiabilidade antes da distribuição pública

Análise de 29/10/2026: os 154 testes passaram e o banco passou na validação,
com 24 avisos de conteúdo para revisão. Os itens abaixo ficam registrados para
implementação posterior; o registro não significa aprovação para mudar o código.
Os riscos identificados por leitura ainda precisam de reprodução nos cenários reais.

### Prioridade alta

- [ ] **Atualizar o QR code quando a rede mudar.** `server/index.js` descobre o IP
      apenas ao iniciar. Ao trocar o Wi-Fi ou mudar o IP, detectar a alteração e
      atualizar o endereço mostrado na TV, com orientação para reconectar os celulares.

- [ ] **Tratar porta ocupada e abertura duplicada.** Hoje não há tratamento amigável
      para falha ao abrir a porta 3000. Identificar uma instância do próprio jogo e
      reaproveitá-la; se a porta pertencer a outro programa, escolher outra porta ou
      mostrar uma solução clara. O QR code deve usar a porta efetivamente aberta.

- [ ] **Confirmar o recebimento das ações no celular.** Em
      `public/controlador/controlador.js`, a alternativa é bloqueada antes da
      confirmação do servidor, e ações são descartadas se o WebSocket não estiver
      aberto. Evitar mostrar como enviada uma resposta que não chegou. Permitir
      recuperação sem resposta duplicada e respeitando a fase e o tempo da pergunta.

- [ ] **Mostrar perda de conexão na TV.** `public/tv/tv.js` tenta reconectar sem aviso
      visível. Exibir o estado da conexão e retirar o aviso ao restaurar a partida,
      para uma tela parada não parecer um travamento do jogo.

- [ ] **Encerrar o jogo de forma clara.** Hoje fechar a janela da TV mantém o servidor
      funcionando. Na versão distribuída, oferecer uma saída com confirmação que
      encerre a janela e o servidor, preservando a possibilidade de recuperar a TV
      após um fechamento acidental.

- [ ] **Validar mensagens WebSocket antes de executar ações.** Reprodução isolada:
      enviar JSON `null` ao tratamento de mensagens de `server/app.js` provoca
      `TypeError` ao acessar `mensagem.type`. Rejeitar estruturas e campos inválidos,
      conferir jogador e permissões e tratar erros sem derrubar a partida.
      Adicionar testes para esses caminhos, ausentes da suíte atual.

### Prioridade média

- [ ] **Impedir jogadores duplicados na mesma conexão.** Reprodução isolada:
      `adicionarJogador()` aceita duas entradas pelo mesmo socket; ao fechá-lo,
      `removerJogadorPorWs()` remove apenas uma, deixando uma vaga ocupada.
      Garantir uma identidade por conexão e testar a limpeza ao desconectar.

- [ ] **Dar tolerância à reconexão no lobby.** Hoje a desconexão remove imediatamente
      o jogador e invalida seu token. Avaliar uma reserva curta para recarregar a
      página sem perder animal ou posto de anfitrião, sem prender vagas abandonadas.

- [ ] **Facilitar a recuperação quando falta alguém confirmar o resultado.** O avanço
      depende de todos os conectados apertarem continuar, sem limite de espera.
      Deixar claro quem falta e definir uma ação explícita para o anfitrião resolver
      uma espera por alguém que abandonou o celular. Preservar a regra de confirmação
      até que a mudança de comportamento seja aprovada.

- [ ] **Tornar o reinício acessível ao anfitrião.** Atualmente exige cinco toques na
      identificação do jogador. Criar um menu visível, mantendo a confirmação antes
      de descartar a partida.

---

## Distribuição para Windows

- [ ] **Criar instalação para quem não programa.** Preparar instalador com Inno Setup,
      runtime Node.js e dependências incluídos, atalhos e abertura direta da TV.
      O uso diário não deve exigir terminal ou instalação manual de dependências.

- [ ] **Diagnosticar falhas de abertura e conexão.** Mostrar mensagens compreensíveis
      para ausência de rede e falha ao iniciar o servidor, com logs para suporte.
      Validar a configuração do Firewall e orientar quando os celulares não alcançam
      o jogo, incluindo redes de visitantes ou isolamento entre aparelhos.

- [ ] **Validar em instalação limpa.** Testar em um Windows sem Node.js nem ferramentas
      de desenvolvimento, com Firewall ativo, incluindo instalação, primeira abertura,
      conexão dos celulares, encerramento e abertura novamente.

---

## Raspberry Pi 4 com 4 GB

- [ ] **Conferir a identidade do processo nos scripts de iniciar e parar.** Hoje
      `raspberry-pi/jogar.sh` e `parar.sh` dependem do PID salvo e de `kill -0`, que
      não comprovam que o processo ainda é o jogo. Evitar reaproveitar ou encerrar
      outro processo caso o PID tenha sido reutilizado.

- [ ] **Impedir inicializações simultâneas no Raspberry Pi.** Adicionar bloqueio para
      dois cliques rápidos não tentarem iniciar dois servidores. Conferir que a
      resposta HTTP de prontidão pertence ao jogo, e não a outro serviço na porta.

- [ ] **Aceitar caminhos com espaços nos atalhos.** `raspberry-pi/instalar.sh` gera
      `Exec=$comando` sem aspas. Ajustar a geração e verificar instalação e abertura
      em uma pasta com espaços no nome.

- [ ] **Melhorar a verificação da rede no Raspberry Pi.** O script verifica apenas se
      existe IPv4 global; isso não comprova acesso pelos celulares. Exibir orientação
      útil para problemas de alcance e conferir o endereço anunciado.

- [ ] **Medir e otimizar no Pi 4 real.** Ainda não há medição que comprove otimização
      para o modelo de 4 GB. Avaliar memória, uso de CPU e fluidez com oito jogadores,
      especialmente desfoques, sombras e animações da TV. Reduzir efeitos conforme
      os resultados; a leitura repetida do banco já tem item em Desempenho.

---

## Validação prática antes do lançamento

Estes itens são cenários a testar, não falhas já comprovadas.

- [ ] **Oito celulares com Android e iPhone.** Jogar uma partida completa com os
      navegadores usados pelo público, incluindo bloqueio e desbloqueio da tela,
      troca de aplicativo, recarga da página e retorno ao jogo.

- [ ] **Quedas e mudanças de rede.** Testar perda e recuperação do Wi-Fi, troca da
      rede do servidor, reconexão dentro e fora do prazo e recuperação da TV.

- [ ] **Uso repetido.** Concluir duas partidas seguidas, abrir o programa várias vezes,
      fechar e abrir a TV durante a partida e verificar encerramento completo.

- [ ] **Telas e textos.** Conferir a TV em 720p e 1080p, perguntas e alternativas longas,
      nomes de jogadores longos e celulares pequenos, sem cortar controles essenciais
      nem exigir rolagem na TV para ler a pergunta.

- [ ] **Partida completa no Pi 4 com 4 GB.** Validar instalação, atalhos, conexão de oito
      jogadores, funcionamento sem internet e estabilidade durante toda a partida.

---

## Fora do escopo por enquanto

Salas múltiplas, hospedagem na web e timeout da Pirâmide.


---

# Adicidonado pelo Rodrigo

 - [ ] **Mais tempo para a tela mostrando quem atacaou quem** Adiconer mais tempo na tela de ataque pois 2 segundos ficou muito rápido. Colocar no máximo 4 segundos para cada ataque.

## Mudanças na Pirâmide

Planejamento para implementação posterior. Regras confirmadas por Rodrigo:

- [ ] **Ampliar a Pirâmide para 16 andares.** A altura maior acompanha o novo sistema
      de saltos, que permite subir até quatro andares por pergunta.

- [ ] **Manter a vantagem inicial pelos pontos anteriores.** A pontuação acumulada
      nas fases anteriores continua determinando o andar de largada. A apresentação
      e a animação dessa vantagem acontecem antes das perguntas da Pirâmide.
      O cálculo da largada precisa ser revisado para a estrutura de 16 andares;
      O limite de vantagem inicial é de 5 andares.

- [ ] **Usar rodadas com a mesma pergunta para todos.** Substituir as perguntas
      individuais e o avanço imediato atual por uma pergunta compartilhada em cada
      rodada. Quem acerta aguarda os demais, sem receber outra pergunta individual.

- [ ] **Permitir tentativas até acertar, como hoje.** Uma alternativa incorreta não
      encerra a participação na pergunta: o jogador pode tentar as outras até acertar.
      Não há perda de andar por erro. O tempo gasto nas tentativas faz parte do tempo
      até o acerto, usado para calcular o salto.

- [ ] **Calcular os saltos pela diferença entre os tempos de acerto.** Quem acerta mais
      rápido pode subir mais andares, com máximo de quatro por pergunta. Quando os
      tempos de acerto forem próximos, o mais rápido sobe no máximo três; uma vantagem
      maior pode liberar o salto de quatro. A fórmula e os limites de tempo ainda
      precisam ser definidos, incluindo quantos andares cada outro jogador sobe.**Reformular promptv**

- [ ] **Esperar todos acertarem antes de animar a subida.** Depois da vantagem inicial,
      nenhuma animação de avanço acontece no momento do acerto individual. Registrar
      o tempo de cada jogador, aguardar todos concluírem a pergunta e só então mostrar
      a subida correspondente aos saltos calculados. Essa espera não se aplica à
      animação da vantagem inicial. A próxima rodada começa após a resolução e a
      animação dos avanços da rodada anterior.

- [ ] **Definir um poder fixo por andar.** Alternar Congelamento, Mordicadores e Névoa
      entre os andares. Antes da pergunta, cada jogador usa o poder correspondente
      ao andar em que está e escolhe somente em quem atacar, sem escolher o tipo de
      poder. 
      (Inicia com congelamento no andar zero depois mordiscadores e depois névoa e segue sucessivamente)

- [ ] **Reservar os ataques coletivos aos quatro últimos andares.** Os andares
      13, 14, 15 e 16 terão cor vermelha (`#800000`). Quem estiver nessa região usa o
      poder do seu andar contra todos os outros jogadores, com seleção de alvos(opção de todos) e sem
      atingir a si mesmo. Exemplo: com quatro participantes, o poder atinge os três
      adversários. Essa opção não existe nos andares anteriores, mesmo que o jogador
      já tenha algum poder de ataque. (Terá somente o botão de selecionar todos os jogadores)

### Decisões pendentes da nova Pirâmide

- [ ] **Fechar a fórmula dos saltos.** Definir a diferença de tempo que libera quatro
      andares, os saltos dos demais e o tratamento de tempos iguais ou muito próximos.

- [ ] **Definir vitória e desempate na resolução coletiva.** Decidir o vencedor se
      mais de um jogador alcançar ou ultrapassar o topo na mesma pergunta, respeitando
      a regra de aguardar todos antes da animação. Acerto mais rápido é uma possibilidade
      a discutir, não uma regra já confirmada.  -> nunca deverá ser possível ter um empate, pois quem respondeu mais rapido e chegou ao topo primeiro mesmo que na mesma pergunta alguem vai ter chegado um milesimo na frente no qual vai fazer ele chegar no topo fazendo o segundo parar no segundo lugar.

- [ ] **Definir a espera em caso de desconexão.** Compatibilizar a exigência de todos
      acertarem com a reserva de reconexão e a remoção de jogadores, evitando bloquear
      a rodada por alguém que saiu. Não introduzir timeout da Pirâmide sem nova decisão. 

- [ ] **Conferir poderes acumulados e reconexão no novo fluxo.** Definir a resolução de
      vários ataques coletivos e individuais na mesma pergunta. Preservar perguntas,
      tentativas, tempos de acerto e estado de espera quando um celular ou a TV voltar.
      Não tem poderes acumulados, somente o da rodada atual. Respeitar a ordem dos ataques coletivos

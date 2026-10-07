#!/bin/sh
#
# Gancho do NetworkManager: roda sozinho toda vez que uma conexão de rede sobe.
#
# Para que serve: quando você leva o Pi para outra casa, ele liga sem conhecer
# o Wi-Fi do lugar. O servidor sobe sem IP e a TV fica sem QR code, porque o IP
# é lido uma única vez, na inicialização (server/index.js). Depois que alguém
# entra no Wi-Fi novo pela área de trabalho, este gancho percebe e reinicia o
# jogo, que então gera o QR code. A TV se atualiza sozinha, sem fechar nada:
# o public/tv/tv.js reconecta o WebSocket a cada 1,5s.
#
# O cuidado importante: ele só reinicia se o jogo TIVER subido sem IP. Se o
# jogo subiu com rede normal e o Wi-Fi apenas oscilou no meio de uma partida,
# nada acontece - reiniciar ali derrubaria todo mundo e trocaria o código da
# sala. Esse é o motivo de a decisão olhar o log da execução atual.
#
# Instalado pelo instalar.sh em /etc/NetworkManager/dispatcher.d/.

INTERFACE="$1"
ACAO="$2"
SERVICO="dominio-pelo-saber"

# só interessa conexão subindo, e nunca a loopback
[ "$ACAO" = "up" ] || exit 0
[ "$INTERFACE" = "lo" ] && exit 0

systemctl is-active --quiet "$SERVICO" || exit 0

# Pega só os logs desta execução do serviço, não os de boots anteriores.
INVOCACAO="$(systemctl show -p InvocationID --value "$SERVICO" 2>/dev/null)"
[ -n "$INVOCACAO" ] || exit 0

# Trecho sem acento de propósito: o dispatcher roda com locale mínimo, e
# comparar caracteres acentuados aqui é pedir para falhar em silêncio.
# A frase vem de server/index.js - se ela mudar lá, este gancho para de agir.
if journalctl "_SYSTEMD_INVOCATION_ID=$INVOCACAO" --output=cat 2>/dev/null \
   | grep -q "IP de rede local"; then
  logger -t "$SERVICO" "Rede subiu em $INTERFACE e o jogo estava sem IP - reiniciando para gerar o QR code."
  # --no-block: o dispatcher do NetworkManager tem tempo limite e não deve
  # ficar esperando o serviço terminar de subir.
  systemctl restart --no-block "$SERVICO"
fi

exit 0

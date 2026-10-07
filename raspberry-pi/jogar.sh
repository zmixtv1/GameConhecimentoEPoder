#!/usr/bin/env bash
#
# Inicia o jogo: sobe o servidor e abre a tela da TV em tela cheia.
# É isto que o atalho "Domínio pelo Saber" da área de trabalho chama.
#
# O fluxo pensado é: você chega na casa, entra no Wi-Fi do lugar pelo ícone de
# rede, e então abre o jogo. Por isso a primeira coisa que o script faz é
# conferir se existe rede - sem ela o jogo até abriria, mas nenhum celular
# conseguiria entrar na partida, e a TV ficaria sem QR code.

set -u

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTA="${PORTA:-3000}"
ENDERECO="http://localhost:$PORTA/tv/"
ESTADO="${XDG_RUNTIME_DIR:-/tmp}/dominio-pelo-saber"
PID_ARQUIVO="$ESTADO/servidor.pid"
LOG="$ESTADO/servidor.log"
PERFIL="$HOME/.config/dominio-pelo-saber-quiosque"

mkdir -p "$ESTADO"

# O atalho roda sem terminal, então mensagem de erro precisa aparecer na tela.
avisar() {
  if command -v zenity >/dev/null 2>&1; then
    zenity --warning --no-wrap --title="Domínio pelo Saber" --text="$1" 2>/dev/null
  else
    printf '%s\n' "$1" >&2
  fi
}

# ------------------------------------------------------------ 1. tem rede?

if ! ip -4 addr show scope global 2>/dev/null | grep -q "inet "; then
  avisar "O Pi não está conectado a nenhuma rede.

Entre no Wi-Fi da casa primeiro, pelo ícone de rede no canto
da tela, e abra o jogo de novo.

Sem rede os celulares não têm como entrar na partida."
  exit 1
fi

# ------------------------------------------------- 2. o servidor já está no ar?

servidor_vivo() {
  [ -f "$PID_ARQUIVO" ] || return 1
  pid="$(cat "$PID_ARQUIVO" 2>/dev/null)"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null
}

if servidor_vivo; then
  echo "Servidor já estava no ar (pid $(cat "$PID_ARQUIVO")). Reaproveitando."
else
  echo "Subindo o servidor..."
  ( cd "$RAIZ/server" && exec node index.js ) > "$LOG" 2>&1 &
  echo $! > "$PID_ARQUIVO"

  pronto=0
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "$ENDERECO" 2>/dev/null; then
      pronto=1
      break
    fi
    sleep 1
  done

  if [ "$pronto" -ne 1 ]; then
    rm -f "$PID_ARQUIVO"
    avisar "O servidor não subiu.

Últimas linhas do log:

$(tail -n 8 "$LOG" 2>/dev/null)"
    exit 1
  fi
fi

# ------------------------------------------------------------ 3. abre a TV

# Impede a tela de apagar no meio da partida (vale na sessão X11; no Wayland
# quem cuida é a configuração que o instalar.sh já fez pelo raspi-config).
if [ -n "${DISPLAY:-}" ] && command -v xset >/dev/null 2>&1; then
  xset s off -dpms s noblank || true
fi

NAVEGADOR=""
for candidato in chromium-browser chromium firefox-esr; do
  if command -v "$candidato" >/dev/null 2>&1; then
    NAVEGADOR="$candidato"
    break
  fi
done

if [ -z "$NAVEGADOR" ]; then
  avisar "Nenhum navegador encontrado.

Instale com:  sudo apt install -y chromium-browser"
  exit 1
fi

case "$NAVEGADOR" in
  firefox-esr)
    "$NAVEGADOR" --kiosk "$ENDERECO"
    ;;
  *)
    # --user-data-dir separado: o jogo não divide perfil com a navegação
    # normal, então nada de aba restaurada ou aviso de "o Chromium não foi
    # encerrado corretamente" aparecendo por cima do jogo.
    "$NAVEGADOR" \
      --kiosk \
      --noerrdialogs \
      --disable-infobars \
      --disable-session-crashed-bubble \
      --disable-features=Translate \
      --check-for-update-interval=31536000 \
      --user-data-dir="$PERFIL" \
      "$ENDERECO"
    ;;
esac

# Fechar a janela de propósito ou sem querer (Alt+F4) NÃO derruba a partida: o
# servidor continua no ar e os celulares seguem conectados. Basta abrir o
# atalho de novo para a TV voltar. Para encerrar de verdade, use o atalho
# "Parar o jogo" ou desligue o Pi.
echo "Tela da TV fechada. O servidor continua no ar (pid $(cat "$PID_ARQUIVO" 2>/dev/null))."
echo "Para encerrar: $RAIZ/raspberry-pi/parar.sh"

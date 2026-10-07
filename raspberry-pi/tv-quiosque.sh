#!/usr/bin/env bash
#
# Abre a tela da TV em tela cheia assim que o servidor do jogo estiver no ar.
# Chamado pelo autostart da sessão gráfica (~/.config/autostart), não pelo
# systemd - ele precisa da sessão gráfica já montada para ter onde desenhar.

set -u

PORTA="${PORTA:-3000}"
ENDERECO="http://localhost:$PORTA/tv/"
PERFIL="$HOME/.config/dominio-pelo-saber-quiosque"

# A TV reconecta o WebSocket sozinha se a conexão cair (public/tv/tv.js), mas
# não recarrega a página se o PRIMEIRO acesso falhar - ficaria parada na tela de
# erro do navegador. Por isso esperamos o servidor responder antes de abrir.
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "$ENDERECO" 2>/dev/null; then
    break
  fi
  sleep 1
done

# Impede a tela de apagar no meio da partida. Só vale numa sessão X11; no
# Wayland (padrão no Raspberry Pi OS atual) quem cuida disso é o raspi-config,
# que o instalar.sh já ajusta.
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
  echo "Nenhum navegador encontrado. Instale com: sudo apt install -y chromium-browser" >&2
  exit 1
fi

case "$NAVEGADOR" in
  firefox-esr)
    exec "$NAVEGADOR" --kiosk "$ENDERECO"
    ;;
  *)
    # --user-data-dir separado: o jogo não divide perfil com a navegação normal,
    # então nada de aba restaurada ou "o Chromium não foi encerrado corretamente"
    # aparecendo por cima do jogo.
    exec "$NAVEGADOR" \
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

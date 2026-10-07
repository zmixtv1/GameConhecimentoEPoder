#!/usr/bin/env bash
#
# Instala o Domínio pelo Saber no Raspberry Pi, com o Pi ligado na TV por HDMI.
#
# Depois disso, ligar o Pi na tomada já põe o jogo na tela: o servidor sobe
# sozinho e o navegador abre a tela da TV em tela cheia. Sem teclado, sem SSH.
#
#   Uso:  ./raspberry-pi/instalar.sh
#
# Rode como o seu usuário normal, SEM sudo - o script pede sudo sozinho só nas
# partes que precisam (instalar pacote e criar o serviço).

set -euo pipefail

SERVICO="dominio-pelo-saber"
PORTA="${PORTA:-3000}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AQUI="$RAIZ/raspberry-pi"
USUARIO="$(id -un)"

info() { printf '\n\033[1;36m==>\033[0m %s\n' "$1"; }
erro() { printf '\n\033[1;31mErro:\033[0m %s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- verificações

if [ "$(id -u)" -eq 0 ]; then
  erro "Rode sem sudo, como o seu usuário normal.
O script pede sudo sozinho onde precisa. Rodando tudo como root, o modo
quiosque seria instalado na casa do root e não abriria na sua sessão."
fi

command -v sudo >/dev/null 2>&1 || erro "O comando sudo não existe nesta máquina."
[ -f "$RAIZ/server/package.json" ] || erro "Não achei o server/package.json. Rode o script de dentro do repositório clonado."

info "Instalando para o usuário '$USUARIO', a partir de $RAIZ"

# ----------------------------------------------------------------- Node.js 18+

info "Conferindo o Node.js"
instalar_node=1
if command -v node >/dev/null 2>&1; then
  maior="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [ "$maior" -ge 18 ] 2>/dev/null; then
    echo "Node $(node -v) já serve."
    instalar_node=0
  else
    echo "Node $(node -v) é antigo demais (o jogo precisa do 18 ou mais novo)."
  fi
else
  echo "Node.js não está instalado."
fi

if [ "$instalar_node" -eq 1 ]; then
  info "Instalando o Node.js 22 pelo NodeSource"
  echo "O Node que vem no apt do Raspberry Pi OS costuma ser velho demais."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

NODE_BIN="$(command -v node)"

# ------------------------------------------------------------------ navegador

if ! command -v chromium-browser >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1; then
  info "Instalando o Chromium (para a tela da TV)"
  sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium
fi

# --------------------------------------------------------------- dependências

info "Instalando as dependências do servidor"
echo "São 97 pacotes, todos JavaScript puro - não compila nada, é rápido mesmo no Pi."
( cd "$RAIZ/server" && npm install --no-audit --no-fund )

# ------------------------------------------------------------ serviço systemd

info "Criando o serviço '$SERVICO' (sobe sozinho no boot)"
chmod +x "$AQUI/esperar-rede.sh" "$AQUI/tv-quiosque.sh"

sed -e "s|__USUARIO__|$USUARIO|g" \
    -e "s|__DIRETORIO__|$RAIZ|g" \
    -e "s|__PORTA__|$PORTA|g" \
    -e "s|__NODE__|$NODE_BIN|g" \
    "$AQUI/$SERVICO.service" \
  | sudo tee "/etc/systemd/system/$SERVICO.service" >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICO" >/dev/null
sudo systemctl restart "$SERVICO"

# ------------------------------------------------------ Wi-Fi sempre acordado

if [ -d /etc/NetworkManager ]; then
  info "Desligando a economia de energia do Wi-Fi"
  echo "Por padrão o rádio do Pi dorme entre pacotes, o que adiciona atraso e"
  echo "instabilidade - ruim num jogo que dá bônus por velocidade de resposta."
  sudo tee /etc/NetworkManager/conf.d/99-wifi-sem-economia.conf >/dev/null <<'CONF'
# O Pi aqui é um servidor que precisa responder na hora, não um laptop
# poupando bateria. 2 = desliga a economia de energia do Wi-Fi.
[connection]
wifi.powersave = 2
CONF
  sudo systemctl reload NetworkManager 2>/dev/null || true
fi

# ------------------------------------------------------- modo quiosque na TV

info "Configurando a TV para abrir sozinha no boot"
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/$SERVICO-tv.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Domínio pelo Saber (TV)
Comment=Abre a tela do jogo em tela cheia
Exec=$AQUI/tv-quiosque.sh
Terminal=false
X-GNOME-Autostart-enabled=true
DESKTOP
echo "Autostart gravado em $HOME/.config/autostart/$SERVICO-tv.desktop"

if command -v raspi-config >/dev/null 2>&1; then
  info "Desligando o apagamento automático da tela"
  echo "Sem isso a TV apaga no meio da partida."
  sudo raspi-config nonint do_blanking 1 \
    || echo "Não consegui pelo raspi-config. Dá para desligar na mão em:
  sudo raspi-config > Display Options > Screen Blanking"
fi

# ---------------------------------------------------------------- conferência

info "Conferindo se o jogo subiu"
sleep 3

if systemctl is-active --quiet "$SERVICO"; then
  echo "O serviço está rodando."
else
  erro "O serviço não subiu. Veja o que aconteceu com:
  sudo journalctl -u $SERVICO -n 40 --no-pager"
fi

echo
sudo journalctl -u "$SERVICO" -n 12 --no-pager --output=cat || true

cat <<FIM

================================================================
 Pronto. Reinicie o Pi para ver o resultado final:  sudo reboot

 Depois do boot, a TV abre sozinha mostrando o código da sala e
 o QR code. Os celulares escaneiam o QR e entram.

 Comandos úteis:
   sudo systemctl status $SERVICO      ver se está no ar
   sudo systemctl restart $SERVICO     reiniciar (gera código novo)
   sudo journalctl -u $SERVICO -f      acompanhar ao vivo
================================================================
FIM

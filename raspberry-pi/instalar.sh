#!/usr/bin/env bash
#
# Prepara o Raspberry Pi para rodar o Domínio pelo Saber.
#
# Depois disto o jogo vira um ícone na área de trabalho: você entra no Wi-Fi da
# casa e abre o jogo. Nada sobe sozinho no boot - quem manda é você.
#
#   Uso:  ./raspberry-pi/instalar.sh
#
# Rode como o seu usuário normal, SEM sudo - o script pede sudo sozinho nas
# partes que precisam.

set -euo pipefail

NOME="dominio-pelo-saber"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AQUI="$RAIZ/raspberry-pi"

info() { printf '\n\033[1;36m==>\033[0m %s\n' "$1"; }
erro() { printf '\n\033[1;31mErro:\033[0m %s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- verificações

if [ "$(id -u)" -eq 0 ]; then
  erro "Rode sem sudo, como o seu usuário normal.
Como root, os atalhos iriam para a área de trabalho do root, não para a sua."
fi

command -v sudo >/dev/null 2>&1 || erro "O comando sudo não existe nesta máquina."
[ -f "$RAIZ/server/package.json" ] || erro "Não achei o server/package.json. Rode o script de dentro do repositório clonado."

info "Instalando para o usuário '$(id -un)', a partir de $RAIZ"

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

# ------------------------------------------------------------------ programas

if ! command -v chromium-browser >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1; then
  info "Instalando o Chromium (para a tela da TV)"
  sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium
fi

# zenity é o que mostra o aviso "entre no Wi-Fi primeiro" na tela: o atalho
# roda sem terminal, então sem ele um erro acontece em silêncio.
command -v zenity >/dev/null 2>&1 || { info "Instalando o zenity (avisos na tela)"; sudo apt-get install -y zenity; }

# --------------------------------------------------------------- dependências

info "Instalando as dependências do servidor"
echo "São 97 pacotes, todos JavaScript puro - não compila nada, é rápido mesmo no Pi."
( cd "$RAIZ/server" && npm install --no-audit --no-fund )

chmod +x "$AQUI/jogar.sh" "$AQUI/parar.sh"

# ---------------------------------------------------------------- os atalhos

info "Criando os atalhos"

criar_atalho() {
  local arquivo="$1" titulo="$2" comentario="$3" comando="$4" icone="$5"
  cat > "$arquivo" <<DESKTOP
[Desktop Entry]
Type=Application
Name=$titulo
Comment=$comentario
Exec=$comando
Icon=$icone
Terminal=false
Categories=Game;
DESKTOP
  chmod +x "$arquivo"
}

# A pasta da área de trabalho tem nome traduzido quando o sistema está em
# português ("Área de trabalho"), então perguntamos ao sistema em vez de chutar
# "Desktop" - senão o ícone não apareceria e só sobraria a entrada no menu.
AREA_TRABALHO="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
[ -n "$AREA_TRABALHO" ] || AREA_TRABALHO="$HOME/Desktop"

mkdir -p "$HOME/.local/share/applications"
for destino in "$HOME/.local/share/applications" "$AREA_TRABALHO"; do
  [ -d "$destino" ] || continue
  criar_atalho "$destino/$NOME.desktop" \
    "Domínio pelo Saber" "Abre o jogo na TV" \
    "$AQUI/jogar.sh" "applications-games"
  criar_atalho "$destino/$NOME-parar.desktop" \
    "Parar o jogo" "Encerra o servidor do jogo" \
    "$AQUI/parar.sh" "process-stop"
  echo "Atalhos criados em $destino"
done

# Limpeza: se uma versão anterior deste projeto tiver deixado o jogo subindo
# sozinho no boot, desfaz. Hoje quem decide a hora de rodar é você.
if [ -f "$HOME/.config/autostart/$NOME-tv.desktop" ]; then
  rm -f "$HOME/.config/autostart/$NOME-tv.desktop"
  echo "Removido o início automático antigo."
fi
if systemctl list-unit-files "$NOME.service" >/dev/null 2>&1 \
   && systemctl is-enabled --quiet "$NOME" 2>/dev/null; then
  sudo systemctl disable --now "$NOME" >/dev/null 2>&1 || true
  sudo rm -f "/etc/systemd/system/$NOME.service" "/etc/NetworkManager/dispatcher.d/99-$NOME"
  sudo systemctl daemon-reload
  echo "Removido o serviço antigo que subia no boot."
fi

# ------------------------------------------------------------ ajustes da sala

if command -v raspi-config >/dev/null 2>&1; then
  info "Desligando o apagamento automático da tela"
  echo "Sem isso a TV apaga no meio da partida."
  sudo raspi-config nonint do_blanking 1 \
    || echo "Não consegui pelo raspi-config. Dá para desligar na mão em:
  sudo raspi-config > Display Options > Screen Blanking"
fi

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

cat <<FIM

================================================================
 Pronto.

 Para jogar, em qualquer casa:

   1. Entre no Wi-Fi do lugar (ícone de rede, no canto da tela)
   2. Abra o atalho "Domínio pelo Saber" na área de trabalho
      (ele também fica no menu de aplicativos, em Jogos)

 A TV mostra o código da sala e o QR code; os celulares
 escaneiam e entram. Nada sobe sozinho no boot.

 Fechar a janela da TV não acaba a partida - o servidor segue
 no ar e o atalho traz a tela de volta. Para encerrar mesmo,
 use "Parar o jogo".
================================================================
FIM

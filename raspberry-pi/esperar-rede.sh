#!/usr/bin/env bash
#
# Espera a rede local ter um IP de verdade, antes de o servidor do jogo subir.
#
# Por que isso existe: o servidor lê o IP da máquina uma única vez, ao iniciar
# (server/index.js), para montar o link do QR code que aparece na TV. No boot do
# Raspberry Pi o systemd costuma chegar aqui antes de o Wi-Fi associar - sem esta
# espera, o jogo sobe sem IP e a TV fica sem QR code até alguém reiniciar o
# serviço na mão.
#
# Desiste depois de 30s e deixa o jogo subir mesmo assim: é melhor um jogo no ar
# sem QR code (dá para digitar o código da sala na mão) do que nenhum jogo.

set -u

for _ in $(seq 1 30); do
  if ip -4 addr show scope global 2>/dev/null | grep -q "inet "; then
    exit 0
  fi
  sleep 1
done

echo "Sem IP de rede local depois de 30s - subindo assim mesmo (a TV pode ficar sem QR code)." >&2
exit 0

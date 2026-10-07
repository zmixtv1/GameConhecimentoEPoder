#!/usr/bin/env bash
#
# Encerra o servidor do jogo. É o atalho "Parar o jogo" da área de trabalho.
#
# Serve para quando você quer um código de sala novo sem reiniciar o Pi, ou
# para encerrar a noite. Só fechar a tela da TV não para o servidor, de
# propósito: um Alt+F4 sem querer não pode acabar com a partida.

set -u

ESTADO="${XDG_RUNTIME_DIR:-/tmp}/dominio-pelo-saber"
PID_ARQUIVO="$ESTADO/servidor.pid"

if [ ! -f "$PID_ARQUIVO" ]; then
  echo "O servidor não está no ar."
  exit 0
fi

pid="$(cat "$PID_ARQUIVO" 2>/dev/null)"
rm -f "$PID_ARQUIVO"

if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
  echo "O servidor não está no ar."
  exit 0
fi

kill "$pid" 2>/dev/null

# dá um tempo para sair sozinho antes de insistir
for _ in $(seq 1 10); do
  kill -0 "$pid" 2>/dev/null || break
  sleep 1
done
kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null

echo "Servidor encerrado."

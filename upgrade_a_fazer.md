# Upgrades a fazer

Regras:
- Toda mudança no projeto passa por este arquivo; só mexo no código depois de o item estar aqui e aprovado.
- Quando um upgrade é concluído e verificado, ele **sai** deste arquivo (não fica marcado como feito).

Status: `[ ]` a fazer · `[~]` em andamento

---

- [ ] **Escolha do IP que vai para o QR code.** `obterIpLocal()` (server/index.js:12) devolve o
      primeiro IPv4 não-interno que encontra, e é chamado uma única vez, na subida do servidor.
      Isso dá dois problemas no Raspberry Pi: com `eth0` e `wlan0` ligados ao mesmo tempo, o QR
      code pode anunciar a rede errada; e se o servidor subir antes de o Wi-Fi associar, o QR não
      aparece até alguém reiniciar o serviço na mão. Hoje está contornado por fora, pelo
      `raspberry-pi/esperar-rede.sh`, que segura a subida até existir um IP. A correção de verdade
      seria escolher a interface pela rota padrão e reavaliar o IP quando a rede mudar.

---

## Fora do escopo por enquanto

Salas múltiplas, hospedagem na web, timeout da Pirâmide e cache do banco de perguntas.

# Upgrades a fazer

Regras:
- Toda mudança no projeto passa por este arquivo; só mexo no código depois de o item estar aqui e aprovado.
- Quando um upgrade é concluído e verificado, ele **sai** deste arquivo (não fica marcado como feito).

Status: `[ ]` a fazer · `[~]` em andamento

---

- [ ] **Escolha da interface de rede para o QR code.** `obterIpLocal()` (server/index.js:12)
      devolve o primeiro IPv4 não-interno que encontrar. Com cabo e Wi-Fi ligados ao mesmo
      tempo, ele pode anunciar no QR code a interface errada, e os celulares não chegam no
      jogo. Hoje está contornado só pela documentação ("deixe uma das duas ativa"). A correção
      seria escolher a interface pela rota padrão.

---

## Fora do escopo por enquanto

Salas múltiplas, hospedagem na web, timeout da Pirâmide e cache do banco de perguntas.

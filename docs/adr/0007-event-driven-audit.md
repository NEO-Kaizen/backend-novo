---
status: aceito
---

# Auditoria orientada a evento de domínio

O produto exige trilha de auditoria imutável, gravada na mesma transação da alteração que descreve, com autor, valor anterior e novo valor. No backend legado isso vira dependência circular: `auditHistory.service` importa `requests.repository` para resolver o contexto da solicitação auditada, e os serviços de cada domínio precisam lembrar de chamar a auditoria — os gatilhos estão espalhados por todos os lugares.

Decidimos que a auditoria é **orientada a evento**: o domínio que causa a alteração publica um evento de domínio com payload imutável e autocontido, e o domínio de auditoria assina o evento e grava o registro. A publicação acontece dentro da transação e a entrega é **síncrona e awaited** — o handler de auditoria roda inline, usa a mesma transação, e uma falha nele **desfaz a alteração**.

## Alternativas consideradas

- **Chamada explícita a auditoria em cada serviço.** Mais simples de ler, mas acopla cada domínio ao de auditoria, espalha os pontos de disparo e não elimina o ciclo: o serviço de auditoria ainda precisa ler a solicitação.
- **Outbox com consumidor assíncrono.** Desacopla de vez e quebra a garantia de mesma transação — entre a alteração e o registro da auditoria haveria uma janela sem rastro, o que contraria a regra do produto.

## Consequências

- O domínio que altera não conhece o domínio de auditoria. A dependência é de mão única.
- O payload do evento é um snapshot (`requestId`, origem, destino, ator), nunca uma referência a entidade. Sem essa regra, o consumidor puxa o agregado de volta e o ciclo nasce.
- A auditoria é obrigatória: falha do handler aborta a transação. Auditoria não é best-effort.
- A leitura da auditoria usa as portas de leitura publicadas pelos outros domínios, sem que a escrita dependa delas.
- Eventos de domínio são o ponto de extensão natural para exportações, notificações e integrações futuras.

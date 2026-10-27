---
status: aceito
---

# Auditoria orientada a evento de domínio, com trilha de tentativas separada

O produto exige trilha de auditoria imutável, gravada na mesma transação da alteração que descreve, com autor, valor anterior e novo valor. No backend legado isso vira dependência circular: `auditHistory.service` importa `requests.repository` para resolver o contexto da solicitação auditada, e os serviços de cada domínio precisam lembrar de chamar a auditoria — os gatilhos estão espalhados por todos os lugares.

Decidimos que a auditoria da **alteração** é **orientada a evento**: o domínio que causa a alteração publica um evento de domínio com payload imutável e autocontido, e o domínio de auditoria assina o evento e grava o registro. A publicação acontece dentro da transação e a entrega é **síncrona e awaited** — o handler de auditoria roda inline, usa a mesma transação, e uma falha nele **desfaz a alteração**.

O produto também considera importante registrar **tentativas recusadas** — ações que foram negadas por autorização ou por regra de negócio. Essa trilha tem garantia diferente e **não pode** estar dentro da transação: ela existe justamente porque a transação foi desfeita. Por isso a tentativa é gravada **na borda**, pelo _error handler_, a partir de um `DomainError` que carrega o contexto da recusa. Chegando à borda, a transação já foi desfeita, então a gravação acontece fora dela por construção.

## Alternativas consideradas

- **Chamada explícita a auditoria em cada serviço.** Mais simples de ler, mas acopla cada domínio ao de auditoria, espalha os pontos de disparo e não elimina o ciclo: o serviço de auditoria ainda precisa ler a solicitação.
- **Outbox com consumidor assíncrono.** Desacopla de vez e quebra a garantia de mesma transação — entre a alteração e o registro da auditoria haveria uma janela sem rastro, o que contraria a regra do produto.
- **Uma única trilha para tudo.** Colocaria alteração e tentativa no mesmo lugar, obrigando a escolher: ou a tentativa perde a atomicidade, ou a alteração perde o rastro. A assimetria é real e as duas trilhas precisam de garantias diferentes.
- **Registrar a tentativa no service.** Exigiria que o service soubesse se está dentro de uma transação para escrever fora dela — frágil. Na borda, o requisito é satisfeito de graça.

## Consequências

- O domínio que altera não conhece o domínio de auditoria. A dependência é de mão única.
- O payload do evento é um snapshot (`requestId`, origem, destino, ator), nunca uma referência a entidade. Sem essa regra, o consumidor puxa o agregado de volta e o ciclo nasce.
- A auditoria da alteração é obrigatória: falha do handler aborta a transação. Auditoria não é best-effort.
- A trilha de tentativa é best-effort: se a gravação falhar, o log estruturado registra e a resposta segue. A assimetria de falha é deliberada — a recusa aconteceu de fato e não pode ser perdida em silêncio.
- O critério de auditabilidade é explícito no erro (`DomainError.context`), não inferido de uma lista na borda: quem recusa sabe o que tentou e decide se vale rastro.
- Erro de validação (`400`) não é auditado — é ruído de entrada. Falha de autenticação (`401`) pertence ao log de segurança do domínio `auth`.
- A auditoria só existe **após o commit**. Transação longa atrasa o rastro — por isso as transações são curtas e não seguram I/O externo.
- Ordem de commit não é ordem de ocorrência: `occurred_at` é tempo de negócio, e com concorrência duas transações podem commitar fora da ordem em que começaram. A linha do tempo ordena por tempo de negócio.
- Log de aplicação não é transacional: existe para operações que foram desfeitas. **O log nunca é evidência** — para saber o que aconteceu, olhe a auditoria.

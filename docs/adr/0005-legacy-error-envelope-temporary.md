---
status: aceito
---

# Envelope de erro legado mantido por ora

O `CODING_STANDARDS.md` deste repositório define a resposta de erro como `{ "error": { "code", "message", "requestId" } }`. O contrato vigente com o frontend e os contratos publicados do produto usam `{ "status": "error", "statusCode", "message" }`. Trocar agora quebraria o frontend: `readErrorMessage` em `src/lib/api/client.ts` lê `body.message || body.error` e passaria a renderizar `[object Object]`.

Decidimos **manter o envelope legado** enquanto o frontend não for alterado, e registrar a migração como pendência explícita. O envelope alvo é `{ "error": { "code", "message", "requestId" } }`, que adiciona código estável e correlação por requisição; a migração exige uma mudança coordenada no `apiClient` e nos tipos do frontend.

## Alternativas consideradas

- **Envelope híbrido** (`status`, `statusCode`, `message`, `code`, `requestId` e `error` juntos). Atenderia os dois lados de uma vez, mas cria duas formas de ler a mesma informação e nenhuma delas é a canônica.
- **Mudar só o backend e deixar o frontend quebrar.** Sem versão coordenada de release, não é viável.

## Consequências

- A implementação diverge do `CODING_STANDARDS.md` até a migração. Este ADR é o registro dessa divergência, e a decisão é **temporária**: sai quando a migração do envelope for coordenada com o frontend.
- O campo `code` pode ser adicionado ao envelope legado como passo intermediário — é aditivo e não quebra o cliente atual.
- Quando a migração acontecer, `core/http/error-mapper.ts` e o error handler mudam em um único lugar.

## Gatilho da migração (emenda — issue #30)

A migração do envelope legado para `{ error: { code, message, requestId } }` ocorre em um único cutover coordenado quando **todos** os itens abaixo estiverem prontos:

1. Frontend aceita os dois formatos em `readErrorMessage` e tipa `ApiError`.
2. Frontend aceita UUID e passa a usar `status.key` (não id numérico).
3. Frontend inclui `Admin Root` nas uniões de perfil.
4. Header do solicitante: janela com `X-Requester-Email` e `X-Requester-Identity` concluída.
5. Auditoria: contrato → tipos do FE → rota, em camelCase.

Até lá, o envelope legado é o contrato vigente; `code` (e `requestId`) são aditivos. A fonte única das convenções (incluindo este envelope) é `docs/04-API-Conventions.md`. A tabela completa de convenções e os critérios de revisão de spec estão nesse documento.

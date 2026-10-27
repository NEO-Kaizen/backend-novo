# Template de spec de domínio

§4 deste template é ponteiro para [`docs/04-API-Conventions.md`](./04-API-Conventions.md): toda convenção transversal (base path, envelope de erro, paginação, sessão, autorização, concorrência, content types, datas, idioma, request-id, rate limit, CORS) está lá e **não é redefinida aqui**.

## 1. Contexto

## 2. Escopo

## 3. Fora de escopo

## 4. Convenções de API

Ver [`docs/04-API-Conventions.md`](./04-API-Conventions.md). Esta spec apenas referencia as convenções herdadas; divergência exige emenda naquele documento.

## 5. Endpoints

- método, path sob `/api/v1`, auth, capability.

## 6. Paginação

- default/máximo/exceção por endpoint (ou "não paginado" justificado).

## 7. Erros

- códigos do catálogo + códigos de domínio (registrar em `error-codes.ts`).

## 8. Validação

- campos, limites e mensagens pt-BR (ver §3 daquele documento e [CODING_STANDARDS.md](../CODING_STANDARDS.md) §6).

## 9. Multipart

- rotas, limites e 400/413/415 (ver §9 daquele documento).

## 10. Concorrência

- operações com `targetStatusKey` e `expectedStatusKey` (ver §8.1 daquele documento).

## 11. Idempotência

- endpoints classificados pela tabela de idempotência (§8.2 daquele documento).

## 12. Datas

- tipo (timestamp vs data pura) por campo (ver §10 daquele documento).

## 13. Checklist de revisão

Ver [`docs/04-API-Conventions.md`](./04-API-Conventions.md) §16.

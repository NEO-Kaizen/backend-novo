# OpenAPI — comandos e artefato

## Artefato

O contrato versionado vive em `openapi/openapi.json` (raiz do repositório) e é **commitado**. Ele é gerado a partir dos schemas Zod e dos metadados de rota por `npm run docs:generate`; a edição manual é proibida.

`info.version` segue a regra de `04-HTTP-Contract.md` §11: versiona o contrato, não o `package.json`.

## Comandos

```bash
npm run docs:generate   # regenera openapi/openapi.json
npm run docs:lint       # spectral lint openapi/openapi.json
npm run docs:check      # regenera e falha se o artefato estiver desatualizado
npm run contract:check  # cobertura rota↔operação e matriz DOCS_ENABLED
```

## Regra de artefato commitado

- Toda mudança de rota ou schema regenera o artefato no mesmo PR via `npm run docs:generate`.
- `npm run docs:check` deve passar; diff inesperado no artefato é erro.
- O job `quality` do CI roda `docs:check`, `docs:lint` e `contract:check`, mais `contract:check --probe`.
- Breaking change exige label `breaking-change` e plano de `/api/v2` (gate `oasdiff breaking` quando o workflow existir).

## Lint

`spectral lint openapi/openapi.json` usa `spectral:oas`; `.spectral.yaml` eleva `operation-operationId` e `operation-tags` a erro. Não há regras customizadas; as regras de `description`/`example` em schema serão adicionadas depois. O artefato já traz exemplos em todos os schemas e parâmetros; a regra que os exige ainda não existe. Enquanto `paths` estiver vazio, os warnings de componente não usado e de `info` são esperados.

## Exposição

- Exposição segue `04-HTTP-Contract.md` §13: fora de produção por padrão; produção só com `DOCS_ENABLED=true`, e `false` desliga em qualquer ambiente.
- UI (Scalar via `@scalar/express-api-reference` + `@scalar/api-reference`) em `/api/v1/docs`; o HTML e o bundle UMD em `/api/v1/docs/assets/standalone.js` são servidos pelo backend.
- Spec em `/api/v1/openapi.json`.

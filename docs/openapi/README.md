# OpenAPI — comandos e artefato

## Artefato

O contrato publicado vive em `openapi/openapi.json` (raiz do repositório) e é **commitado**. Ele é gerado a partir dos schemas Zod e dos metadados de rota; edição manual é proibida.

## Comandos

```bash
npm run docs:generate   # regenera openapi/openapi.json
npm run docs:lint       # spectral lint openapi/openapi.json
npm run docs:check      # regenera e falha se o artefato estiver desatualizado
```

## Regra de artefato commitado

- Toda mudança de rota ou schema regenera o artefato no mesmo PR.
- `docs:check` deve passar em CI; diff inesperado quebra o build.
- Breaking change exige label `breaking-change` e plano de `/api/v2` (ver `oasdiff breaking` no workflow).

## Lint

`spectral lint openapi/openapi.json` usa `.spectral.yaml` (`spectral:oas` + regras customizadas). Regras mínimas: `operation-operationId`, `operation-tags`, schemas com `description`/`example`.

## Exposição

- Documentação e UI desabilitadas em produção por padrão; habilitação via `DOCS_ENABLED=true`.
- UI (Scalar self-hosted) em `/api/v1/docs`; spec em `/api/v1/openapi.json`.

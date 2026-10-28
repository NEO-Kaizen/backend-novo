# OpenAPI — comandos e artefato

## Artefato

O contrato versionado vive em `openapi/openapi.json` (raiz do repositório) e é **commitado**. Enquanto o gerador não existir, ele é mantido manualmente; quando existir, passa a ser gerado a partir dos schemas Zod e dos metadados de rota, e a edição manual fica proibida.

`info.version` segue a regra de `04-HTTP-Contract.md` §11: versiona o contrato, não o `package.json`.

## Comandos

```bash
npm run docs:generate   # regenera openapi/openapi.json
npm run docs:lint       # spectral lint openapi/openapi.json
npm run docs:check      # regenera e falha se o artefato estiver desatualizado
```

Enquanto os scripts não existirem, a validação manual é `npx @stoplight/spectral-cli lint openapi/openapi.json`.

## Regra de artefato commitado

- Quando o gerador existir, toda mudança de rota ou schema regenera o artefato no mesmo PR.
- Quando o gate de CI existir, `docs:check` deve passar; diff inesperado quebra o build.
- Breaking change exige label `breaking-change` e plano de `/api/v2` (gate `oasdiff breaking` quando o workflow existir).

## Lint

`spectral lint openapi/openapi.json` usa `spectral:oas`; `.spectral.yaml` eleva `operation-operationId` e `operation-tags` a erro. Não há regras customizadas; as regras de `description`/`example` em schema serão adicionadas depois. O artefato já traz exemplos em todos os schemas e parâmetros; a regra que os exige ainda não existe. Enquanto `paths` estiver vazio, os warnings de componente não usado e de `info` são esperados.

## Exposição

- Documentação e UI desabilitadas em produção por padrão; habilitação via `DOCS_ENABLED=true`.
- UI (Scalar self-hosted) em `/api/v1/docs`; spec em `/api/v1/openapi.json`.

# Backend Overview

O backend novo do **MAAT** (Tirador de Pedidos do NEO) é a API que sustenta o portal de registro e acompanhamento de solicitações: o solicitante abre uma solicitação, o time interno tria, prioriza, mapeia e encerra.

Este documento situa o repositório: o que o sistema faz, por que ele está sendo reescrito, o que está no escopo do backend novo e onde ficam as decisões de arquitetura.

Documentos relacionados:

- [`02-Architecture.md`](./02-Architecture.md) — arquitetura em camadas, injeção de dependências, persistência com Knex e regras de modularização.
- [`03-Data-Model.md`](./03-Data-Model.md) — o modelo de dados: tabelas, colunas, relações e invariantes.
- [`04-API-Conventions.md`](./04-API-Conventions.md) — convenções transversais da API v1 herdadas por todas as specs de domínio.
- [`04-HTTP-Contract.md`](./04-HTTP-Contract.md) — política do contrato HTTP e do OpenAPI 3.1.
- [`_template.md`](./_template.md) — template de spec de domínio.
- [`../GLOSSARY.md`](../GLOSSARY.md) — vocabulário do domínio.
- [`adr/`](./adr/) — decisões de arquitetura registradas.

---

## 1. O produto

O MAAT é um portal de _formulário_ de solicitações. O fluxo principal é:

```text
Solicitante preenche o formulário
        ↓
Sistema gera o protocolo e registra a solicitação
        ↓
Fila interna recebe a solicitação
        ↓
Triagem → Mapeamento → Priorização → Execução
        ↓
Solicitante acompanha o andamento pelo protocolo
```

O backend novo é a peça desse fluxo que hoje está instável: ele concentra autenticação, autorização, o ciclo de vida da solicitação, a fila, as pendências de campo, as notas internas, a auditoria e a configuração do portal.

---

## 2. Por que um backend novo

O backend legado (`NEO-Kaizen/backend`) funciona, mas carrega problemas estruturais que não se corrigem sem reescrever a organização do código:

| Problema                                                           | Consequência                                                      | Onde foi resolvido                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Conexão de banco importada como singleton de módulo                | Banco travado no Postgres; nada testável sem banco real           | [ADR-0002](./adr/0002-manual-dependency-injection.md)                                                   |
| Nenhuma injeção de dependência                                     | Dependências implícitas, acoplamento invisível, ausência de fakes | [ADR-0002](./adr/0002-manual-dependency-injection.md)                                                   |
| Serviço de 1.330 linhas misturando seis casos de uso               | Mudança arriscada, revisão inviável                               | [ADR-0001](./adr/0001-layered-architecture-per-domain.md)                                               |
| Transações abertas em serviços **e** repositórios                  | Escopo de transação indefinido, risco de escrita parcial          | [ADR-0001](./adr/0001-layered-architecture-per-domain.md)                                               |
| Domínios importando repositórios de outros domínios                | Fronteiras entre áreas dissolvidas, ciclos entre módulos          | [ADR-0001](./adr/0001-layered-architecture-per-domain.md), [ADR-0007](./adr/0007-event-driven-audit.md) |
| Regras de autorização duplicadas em vários arquivos                | Regra divergente por área, correção parcial                       | [ADR-0006](./adr/0006-static-profile-authorization.md)                                                  |
| SQL específico de Postgres espalhado pelos repositórios            | Troca de engine inviável                                          | [ADR-0003](./adr/0003-knex-dialect-portability.md)                                                      |
| `console.log` como logging                                         | Sem correlação, sem redação de dados sensíveis                    | [02-Architecture § 17](./02-Architecture.md#17-log)                                                     |
| Zero testes automatizados                                          | Nenhuma rede de segurança para uma reescrita                      | [ADR-0002](./adr/0002-manual-dependency-injection.md)                                                   |
| Schema espalhado em três pastas de migration, sem dono             | Modelagem sem responsabilidade clara                              | [ADR-0004](./adr/0004-domain-owned-schema-and-migrations.md)                                            |
| Protocolo lido com `.first()`, sem dono verificado no modo público | Risco de exibir dados de outra solicitação                        | [ADR-0008](./adr/0008-protocol-without-collision-risk.md)                                               |

A lista completa de anti‑padrões que esta arquitetura existe para não repetir está em [02-Architecture § 20](./02-Architecture.md#20-anti-padrões).

A reescrita não é uma reimplementação linha a linha. O legado é a **fonte de requisitos** — regras de negócio, estados, contratos de API e vocabulário — mas a organização do código é nova.

---

## 3. Escopo

**Dentro do escopo:**

- API HTTP do portal MAAT, versionada em `/api/v1`;
- autenticação por sessão e autorização por capability, escopo e atribuibilidade, com os cinco perfis atuais;
- ciclo de vida da solicitação, do protocolo e dos anexos;
- triagem, mapeamento, priorização, pendências e notas internas;
- trilha de auditoria imutável — do que foi alterado e do que foi recusado;
- configuração do portal (categorias, status, aparência, modo de acesso);
- fila, métricas de dashboard e exportações.

**Fora do escopo:**

- regras de interface do usuário (pertencem ao frontend);
- integração com calendário ou ITSM — o mapeamento é registro manual;
- RBAC configurável e perfis customizados — o desenho está no [Apêndice C do modelo de dados](./03-Data-Model.md#24-apêndice-c--modelo-alvo-de-rbac-configurável) e a decisão na [ADR-0025](./adr/0025-authorization-capability-scope.md);
- qualquer decisão de infraestrutura de deploy — fora do escopo deste documento.

---

## 4. Stack

| Item         | Escolha                                                        | Origem                                                              |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Runtime      | Node.js 24+                                                    | `CODING_STANDARDS.md`                                               |
| Módulos      | ESM                                                            | `CODING_STANDARDS.md`                                               |
| Linguagem    | TypeScript ~6.0.3 (alvo 7), modo estrito                       | `CODING_STANDARDS.md`                                               |
| HTTP         | Express 5                                                      | `CODING_STANDARDS.md`                                               |
| Persistência | Knex como query builder, sem ORM                               | [ADR-0003](./adr/0003-knex-dialect-portability.md)                  |
| Validação    | Zod na borda                                                   | [02-Architecture § 13](./02-Architecture.md#13-validação-e-a-borda) |
| Autorização  | Matriz de capabilities em código, com escopo e atribuibilidade | [ADR-0025](./adr/0025-authorization-capability-scope.md)            |
| Auditoria    | Alteração orientada a evento; tentativa gravada na borda       | [ADR-0007](./adr/0007-event-driven-audit.md)                        |

> Ferramentas de apoio: npm (lockfile v3), ESLint (flat config) e Prettier estão definidas em `package.json`, `eslint.config.js` e `.prettierrc`; a guarda do contrato roda por `npm run contract:check`, e o runner definitivo para a suíte completa segue em aberto (issue própria).

---

## 5. Domínios

O backend é organizado em treze domínios, cada um dono de suas tabelas, regras e contratos:

`auth` · `users` · `requests` · `triage` · `mapping` · `queue` · `prioritization` · `pending-items` · `internal-notes` · `audit` · `reports` · `portal-config` · `forms`

O inventário completo, com responsabilidades e portas publicadas por cada domínio, está em [02-Architecture § 5 Catálogo de Domínios](./02-Architecture.md#5-catálogo-de-domínios).

---

## 6. Mapa da documentação

```text
01-Overview.md        → o que é, por que, escopo
02-Architecture.md    → como o código se organiza e por quê
03-Data-Model.md      → as tabelas, as relações e as invariantes do banco
04-API-Conventions.md → convenções transversais da API v1 (envelope, paginação, sessão, ids, datas, request-id, rate limit, CORS)
04-HTTP-Contract.md   → política do contrato HTTP e do OpenAPI 3.1
openapi/README.md     → comandos e regra do artefato OpenAPI
_template.md          → template de spec de domínio
db/README.md          → porta de entrada da documentação do banco
  db/01-vocabulary.md → índice termo → tabela
  db/02-reference.md  → referência do schema (colunas, constraints, índices, FKs)
  db/03-erd.md        → diagramas de entidade
  db/04-seeds.md      → inventário e ordem dos seeds
  db/05-operations.md → operação, migrations, seeds e verificação
  db/schema.dbml      → schema para dbdiagram/dbdocs
GLOSSARY.md           → o que cada termo do domínio significa
adr/                  → decisões que custam caro para reverter
CODING_STANDARDS.md   → como escrever o código
SETUP.md              → como preparar o ambiente
```

As convenções transversais da API v1 estão em [`04-API-Conventions.md`](./04-API-Conventions.md); o contrato HTTP e o padrão OpenAPI estão em [`04-HTTP-Contract.md`](./04-HTTP-Contract.md); o template de spec de domínio está em [`_template.md`](./_template.md).

---

## 7. Pendências registradas

Decisões já tomadas e follow-up que dependem de outro time:

| Item                             | Estado                                                                                                                                                                       | Onde                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| RBAC configurável                | Decidido: matriz em código com 26 chaves, escopo `none`/`owner` (`own`/`all`) e atribuibilidade explícita; perfis customizados são trabalho futuro, desenhados no Apêndice C | [ADR-0025](./adr/0025-authorization-capability-scope.md)     |
| Envelope de erro                 | Decidido: manter o legado por ora; migração exige mudança coordenada no frontend                                                                                             | [ADR-0005](./adr/0005-legacy-error-envelope-temporary.md)    |
| Perfis: cinco ou quatro          | Decidido: cinco no backend; os contratos publicados ainda listam quatro                                                                                                      | [ADR-0006](./adr/0006-static-profile-authorization.md)       |
| Remodelagem do banco             | Decidido: cada domínio é dono do seu schema; as migrações do legado são referência de dados, não de estrutura                                                                | [ADR-0004](./adr/0004-domain-owned-schema-and-migrations.md) |
| Entropia do prefixo do protocolo | Decidido: 40 bits mantidos; a máscara é configurável e a defesa contra enumeração é de borda — rate limit do endpoint público e conferência do e-mail do solicitante         | [ADR-0008](./adr/0008-protocol-without-collision-risk.md)    |

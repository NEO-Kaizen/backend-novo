# Backend Overview

O backend novo do **MAAT** (Tirador de Pedidos) é a API que sustenta o portal de registro e acompanhamento de demandas operacionais: o solicitante abre uma demanda, o time interno tria, prioriza, mapeia e encerra.

Este documento situa o repositório: o que o sistema faz, por que ele está sendo reescrito, o que está no escopo do backend novo e onde ficam as decisões de arquitetura.

Documentos relacionados:

- [`02-Architecture.md`](./02-Architecture.md) — arquitetura em camadas, injeção de dependências, persistência com Knex e regras de modularização.
- [`../GLOSSARY.md`](../GLOSSARY.md) — vocabulário do domínio.
- [`adr/`](./adr/) — decisões de arquitetura registradas.

---

## 1. O produto

O MAAT é um portal de *intake* de demandas. O fluxo principal é:

```text
Solicitante preenche o formulário
        ↓
Sistema gera o protocolo e registra a solicitação
        ↓
Fila interna recebe a demanda
        ↓
Triagem → Mapeamento → Priorização → Execução
        ↓
Solicitante acompanha o andamento pelo protocolo
```

O backend novo é a peça desse fluxo que hoje está instável: ele concentra autenticação, autorização, o ciclo de vida da solicitação, a fila, as pendências de campo, as notas internas, a auditoria e a configuração do portal.

---

## 2. Por que um backend novo

O backend legado (`NEO-Kaizen/backend`) funciona, mas carrega problemas estruturais que não se corrigem sem reescrever a organização do código:

| Problema | Consequência | Onde foi resolvido |
| --- | --- | --- |
| Conexão de banco importada como singleton de módulo | Banco travado no Postgres; nada testável sem banco real | [ADR-0003](./adr/0003-knex-dialect-portability.md) |
| Nenhuma injeção de dependência | Dependências implícitas, acoplamento invisível, ausência de fakes | [ADR-0002](./adr/0002-manual-dependency-injection.md) |
| Serviço de 1.330 linhas misturando seis casos de uso | Mudança arriscada, revisão inviável | [ADR-0001](./adr/0001-layered-architecture-per-domain.md) |
| Transações abertas em serviços **e** repositórios | Escopo de transação indefinido, risco de escrita parcial | [ADR-0001](./adr/0001-layered-architecture-per-domain.md) |
| Domínios importando repositórios de outros domínios | Fronteiras entre áreas dissolvidas, ciclos entre módulos | [ADR-0001](./adr/0001-layered-architecture-per-domain.md), [ADR-0007](./adr/0007-event-driven-audit.md) |
| Regras de autorização duplicadas em seis arquivos | Regra divergente por área, correção parcial | [ADR-0006](./adr/0006-static-profile-authorization.md) |
| SQL específico de Postgres espalhado pelos repositórios | Troca de engine inviável | [ADR-0003](./adr/0003-knex-dialect-portability.md) |
| `console.log` como logging | Sem correlação, sem redação de dados sensíveis | [ADR-0001](./adr/0001-layered-architecture-per-domain.md) |
| Zero testes automatizados | Nenhuma rede de segurança para uma reescrita | [ADR-0002](./adr/0002-manual-dependency-injection.md) |
| Schema espalhado em três pastas de migration, sem dono | Modelagem sem responsabilidade clara | [ADR-0004](./adr/0004-domain-owned-schema-and-migrations.md) |

A reescrita não é uma reimplementação linha a linha. O legado é a **fonte de requisitos** — regras de negócio, estados, contratos de API e vocabulário — mas a organização do código é nova.

---

## 3. Escopo

**Dentro do escopo:**

- API HTTP do portal MAAT, versionada em `/api/v1`;
- autenticação por sessão e autorização por perfil;
- ciclo de vida da solicitação, do protocolo e dos anexos;
- triagem, mapeamento, priorização, pendências e notas internas;
- trilha de auditoria imutável;
- configuração do portal (categorias, status, temas, modo de acesso);
- fila, métricas de dashboard e exportações.

**Fora do escopo:**

- regras de interface do usuário (pertencem ao frontend);
- integração com calendário ou ITSM (o mapeamento é registro manual);
- RBAC configurável pelo administrador — ver [ADR-0006](./adr/0006-static-profile-authorization.md);
- qualquer decisão de infraestrutura de deploy, que vive no repositório de frontend.

---

## 4. Stack

| Item | Escolha | Origem |
| --- | --- | --- |
| Runtime | Node.js 24+ | `CODING_STANDARDS.md` |
| Módulos | ESM | `CODING_STANDARDS.md` |
| Linguagem | TypeScript 7, modo estrito | `CODING_STANDARDS.md` |
| HTTP | Express 5 | `CODING_STANDARDS.md` |
| Persistência | Knex 3 (query builder, sem ORM) | [ADR-0003](./adr/0003-knex-dialect-portability.md) |
| Validação | Zod na borda | `CODING_STANDARDS.md` |
| Autorização | Matriz de permissões em código | [ADR-0006](./adr/0006-static-profile-authorization.md) |
| Auditoria | Escrita orientada a eventos de domínio | [ADR-0007](./adr/0007-event-driven-audit.md) |

> Ferramentas de apoio (gerenciador de pacotes, linter, formatter, runner de testes) ainda não foram decididas e não são tratadas aqui.

---

## 5. Domínios

O backend é organizado em doze domínios, cada um dono de suas tabelas, regras e contratos:

`auth` · `users` · `requests` · `triage` · `mapping` · `queue` · `prioritization` · `pending-items` · `internal-notes` · `audit` · `reports` · `portal-config`

O inventário completo, com responsabilidades e portas publicadas por cada domínio, está em [`02-Architecture.md` § Domain Catalog](./02-Architecture.md#5-domain-catalog).

---

## 6. Mapa da documentação

```text
01-Overview.md      → o que é, por que, escopo
02-Architecture.md  → como o código se organiza e por quê
GLOSSARY.md         → o que cada termo do domínio significa
adr/                → decisões que custam caro para reverter
CODING_STANDARDS.md → como escrever o código
SETUP.md            → como preparar o ambiente
```

---

## 7. Questões em aberto

Itens que precisam de decisão fora do código:

1. **RBAC configurável.** Hoje a autorização é uma matriz em código com cinco perfis fixos. O produto pede perfis configuráveis pelo administrador; a decisão está em [ADR-0006](./adr/0006-static-profile-authorization.md) e a tabela de permissões é trabalho futuro.
2. **Envelope de erro.** O contrato vigente com o frontend é `{ status, statusCode, message }`. O `CODING_STANDARDS.md` pede `{ error: { code, message, requestId } }`. A migração exige mudança coordenada no frontend — ver [ADR-0005](./adr/0005-legacy-error-envelope-temporary.md).
3. **Perfis: cinco ou quatro.** O produto documenta cinco perfis (incluindo *Admin Root*); os contratos de API do repositório de documentação ainda listam quatro. A arquitetura adota cinco — ver [ADR-0006](./adr/0006-static-profile-authorization.md).
4. **Remodelagem do banco.** O schema será refeito junto com o código. As migrações do legado são referência de dados, não de estrutura — ver [ADR-0004](./adr/0004-domain-owned-schema-and-migrations.md).

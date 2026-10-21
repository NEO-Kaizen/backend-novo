---
status: aceito
---

# A chave de permissão é o contrato

O legado não tem permissões: tem papéis. Vinte e cinco chamadas a `requireRole` e catorze auxiliares espalhados pelos serviços decidem o que cada um pode fazer — `canAssignRequest`, `isAdminOrAssignee` (duplicado em dois serviços), `assertRoleIsManageable`, `assertCanCreateOrReview`. O frontend repete as mesmas regras em 164 linhas de `access.service.ts`, com quatro guardas de rota e sete verificações de botão. A matriz está em código, atrás da porta `AuthorizationService` ([ADR-0006](./0006-static-profile-authorization.md)).

Para que a configuração por banco não mude nenhum domínio, a chave de permissão precisa ser um contrato estável, e não uma constante interna de um arquivo. Decidimos que a chave é `recurso:ação`, com um **catálogo único** — registrado em [`docs/03-Data-Model.md`](../03-Data-Model.md) § 21 — que é ao mesmo tempo a lista de permissões da matriz em código e a semente das futuras tabelas `permissions` e `profile_permissions`. O catálogo tem 25 chaves: as 11 da ADR-0006 são subconjunto, e as 14 novas cobrem o que o legado e o frontend já gateavam sem uma chave — leitura da fila, exportação, relatórios, leitura de triagem e de mapeamento, leitura de critérios, leitura e escrita de pendências, leitura de notas internas, leitura de usuários, leitura de configuração, e leitura e gestão de formulários.

As regras de escopo — quem pode agir sobre **esta** solicitação — continuam no serviço, como decide a ADR-0006. Permissão é o que se pode fazer; custódia é sobre o quê.

## Alternativas consideradas

- **Manter só os papéis e adiar a chave.** Enquanto o RBAC for configurável, não há chave para expor. Quando chegasse, o frontend precisaria das chaves, e elas nasceriam sem contrato — cada domaineria com o seu jeito de nomear.
- **Modelar a permissão como recurso e ação já no banco.** A mesma coisa, decidido mais tarde e com o mesmo custo de catálogos paralelos.
- **Derivar a chave do verbário HTTP.** `GET` → `read`, `POST` → `write`. Simples, mas `PATCH /requests/:protocol/status` e `PATCH /requests/:protocol/assignee` são verbs iguais com intenções diferentes, e `GET /reports/requests.csv` é uma leitura com efeito de exportação.

## Consequências

- O frontend continua recebendo o **papel**; a lista de chaves por usuário entra em `GET /auth/me` quando o RBAC configurável chegar.
- A matriz em código passa a ser gerada a partir do catálogo, e não escrita à mão — o catálogo é a fonte.
- Quando o RBAC configurável entrar, a matriz vira um adapter de banco atrás da mesma `AuthorizationService`, semeado pelo mesmo catálogo, e nenhum domínio muda.
- `profiles` continua sendo o eixo; `profile_permissions` é a tabela que o futuro semeia.

---
status: aceito
---

# A chave de permissão é o contrato

> O corpo abaixo registra o catálogo original de 25 chaves e a decisão de manter o escopo no serviço. A [ADR-0025](./0025-authorization-capability-scope.md) o ajustou para 26 chaves (`prioritization:read` saiu; `request:status_override` e `assignee_directory:read` entraram) e acrescentou `scopeOf` à porta. A porta atual já expõe `scopeOf`; o adapter futuro troca só a implementação. A lista de chaves em `GET /auth/me` é aditiva no contrato atual; o que fica para o RBAC configurável é o adapter de banco, não o campo.

O legado não tem permissões: tem perfis. Vinte e cinco chamadas a `requireRole` e catorze auxiliares espalhados pelos serviços decidem o que cada um pode fazer — `canAssignRequest`, `isAdminOrAssignee` (duplicado em dois serviços), `assertRoleIsManageable`, `assertCanCreateOrReview`. O frontend repete as mesmas regras em 164 linhas de `access.service.ts`, com quatro guardas de rota e sete verificações de botão. A matriz está em código, atrás da porta `AuthorizationService` ([ADR-0006](./0006-static-profile-authorization.md)).

Para que a configuração por banco não mude nenhum domínio, a chave de permissão precisa ser um contrato estável, e não uma constante interna de um arquivo. Decidimos que a chave é `recurso:ação`, com um **catálogo único** — registrado em [`docs/03-Data-Model.md`](../03-Data-Model.md) Apêndice B — que é ao mesmo tempo a lista de permissões da matriz em código e a semente das futuras tabelas `permissions` e `profile_permissions`. O catálogo original tinha 25 chaves: as 11 da ADR-0006 são subconjunto, e as 14 novas cobrem o que o legado e o frontend já gateavam sem uma chave — leitura da fila, exportação, relatórios, leitura de triagem e de mapeamento, leitura de critérios, leitura e escrita de pendências, leitura de notas internas, leitura de usuários, leitura de configuração, leitura e gestão de formulários, e **mudança de status da solicitação**.

As regras de escopo — quem pode agir sobre **esta** solicitação — continuam no serviço, como decide a ADR-0006. Permissão é o que se pode fazer; custódia é sobre o quê.

## Alternativas consideradas

- **Manter só os perfis e adiar a chave.** Enquanto o RBAC for configurável, não há chave para expor. Quando chegasse, o frontend precisaria das chaves, e elas nasceriam sem contrato — cada domínio com o seu jeito de nomear.
- **Modelar a permissão como recurso e ação já no banco.** A mesma coisa, decidido mais tarde e com o mesmo custo de catálogos paralelos.
- **Derivar a chave do verbário HTTP.** `GET` → `read`, `POST` → `write`. Simples, mas `PATCH /requests/:protocol/status` e `PATCH /requests/:protocol/assignee` são verbs iguais com intenções diferentes, e `GET /reports/requests.csv` é uma leitura com efeito de exportação.

## Consequências

- O frontend continua recebendo o **papel**; a lista de chaves por usuário entra em `GET /auth/me` quando o RBAC configurável chegar.
- Toda chave da matriz existe no catálogo — o catálogo é a fonte da lista de chaves. A lista **por perfil** continua escrita à mão, porque acrescenta o escopo de custódia, que é regra de serviço e não de permissão.
- Quando o RBAC configurável entrar, a matriz vira um adapter de banco atrás da mesma `AuthorizationService`, semeado pelo mesmo catálogo, e nenhum domínio muda.
- `profiles` continua sendo o eixo; `profile_permissions` é a tabela que o futuro semeia.

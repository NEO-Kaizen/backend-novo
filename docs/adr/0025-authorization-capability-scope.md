---
status: aceito
---

# Autorização por capability, escopo e atribuibilidade

A [ADR-0006](./0006-static-profile-authorization.md) fixou cinco perfis e uma matriz de permissões em código. A [ADR-0014](./0014-permission-key-is-the-contract.md) transformou a chave `recurso:ação` no contrato. As duas decisões continuam válidas para o contrato atual, mas não respondem a duas perguntas que o produto passou a fazer: **sobre qual solicitação** a chave vale e **quem pode receber** uma solicitação.

O legado mistura as duas respostas no perfil. `isAdminOrAssignee` decide custódia pelo nome do perfil; `ASSIGNABLE_PROFILES = ["analista"]` decide quem pode ser atribuído sem relação com as permissões. O frontend repete as mesmas regras em `access.service.ts`. Quando o cliente criar um perfil novo, nenhuma dessas regras acompanha a configuração.

Decidimos separar três coisas:

- **Capability** é o que a chave permite. Continua em `recurso:ação`, no catálogo do Apêndice B.
- **Escopo** é sobre qual linha a chave vale. Uma chave é `none` (global) ou `owner` (a linha precisa estar sob a custódia do ator). Quando é `owner`, a atribuição escolhe `own` ou `all`.
- **Atribuibilidade** é a propriedade de um perfil cujos usuários podem ser escolhidos como Responsável. Não é uma permissão e não deriva de `request:assign`.

## A matriz do contrato

O contrato vigente está no Apêndice B; os pontos abaixo são os que ele fixa.

- O **Analista** é custodial em toda a superfície da solicitação: `request:read`, `triage:read`, `mapping:read`, `pending_item:read`, `internal_note:read`, `audit:read` e as escritas correspondentes. A fila e as métricas também são `own` — o Analista vê o próprio trabalho, não a fila inteira.
- O **Gestor** lê as áreas internas em `all` e escreve apenas nota interna.
- O **Administrador** e o **Admin Root** têm todas as chaves; nas chaves `owner`, o escopo é `all`. A gestão de contas segue a § 7.5.
- `queue:read`, `queue:export`, `request:read` e as chaves de custódia são `owner`; `user`, `portal_config`, `form` e o diretório de atribuíveis são `none`.

`request:assign` continua sendo uma chave própria. `triage:write` não a implica: um perfil pode triar sem transferir, ou distribuir sem triar. A atribuibilidade é derivada das chaves de trabalho — `request:read` + leitura da etapa + escrita da etapa — mas exige uma decisão explícita de participar do pool. Por isso `profiles.is_assignable_triage` e `is_assignable_mapping` existem: o Administrador tem a capability, mas não é atribuível por acidente.

## Chaves que mudam

- **`request:status_override`** substitui a regra “status restrito é do Administrador”. O flag `statuses.is_restricted` continua sendo configuração; a chave diz quem pode entrar nele.
- **`assignee_directory:read`** é a leitura da lista de atribuíveis. Não se confunde com `user:read`: o Analista precisa do diretório para o modal de atribuição, não da lista completa de usuários.
- **`prioritization:read` sai.** A avaliação da solicitação é parte de `request:read`; os critérios são lidos por quem pode escrever a avaliação (`prioritization:write`). Se um dia um perfil somente-leitura precisar dos pesos, entra `prioritization_config:read`, não uma chave que mistura critério e avaliação.
- **`request:claim` não entra agora.** Sem claim, solicitação órfã é atribuída por quem tem `request:assign` em `all`; o Analista custodial só a vê depois de atribuída. A chave e a regra ficam desenhadas no Apêndice C § 24.6, sem entrega nesta fase.

## Frontend e RBAC configurável

O frontend continua recebendo o **perfil** e usando `access.service.ts`. `GET /auth/me` passa a devolver também a lista de chaves e escopos como campo aditivo, que o frontend ignora até ter o consumidor de RBAC. Nenhuma tela muda por causa desta ADR.

O RBAC configurável continua futuro. O **Apêndice C** documenta o modelo alvo completo: tabelas `permissions` e `profile_permissions` com escopo, `profile:read`/`profile:manage`, a separação granular da configuração do portal, o claim e o contrato do frontend. O Apêndice B continua sendo o contrato vigente até o frontend consumir chaves; a gestão de perfis faz parte da migração do Apêndice C.

A regra que limita o produto: **o cliente cria perfis, não capabilities**. Uma chave nova exige código — um ponto de verificação no serviço e uma affordance no frontend. Um perfil novo é uma composição de chaves existentes.

## Invariantes que continuam no código

- status inativo não é alvo;
- solicitação terminal não reabre por esta rota;
- o último Admin Root não é desativado nem trocado de perfil;
- ninguém altera o próprio perfil, status ou senha pelas rotas administrativas;
- um perfil não concede uma chave que não possui;
- a matriz de gestão de contas da § 7.5 continua fechada.

## Alternativas consideradas

- **Derivar `request:assign` de `triage:write`.** Elimina uma chave, mas impede o perfil que tria sem transferir e o que distribui sem triar. A atribuibilidade é derivada; a permissão de atribuir não.
- **Colocar custódia no JWT.** O token envelhece e a custódia muda quando o Responsável muda. O serviço precisa ler `requests.responsible_id` a cada operação.
- **Transformar todo escopo em `own`/`all`.** `theme:manage` e `user:manage` são globais; um escopo vazio só criaria configuração sem significado.
- **Criar um perfil configurável agora.** É um segundo produto: CRUD de perfis, editor de permissões, escopo, auditoria e guardas de escalação. O Apêndice C prepara o desenho, sem antecipar a entrega.

## Consequências

- O Apêndice B ganha `request:status_override`, `assignee_directory:read` e o escopo por perfil; perde `prioritization:read`.
- `profiles` ganha `is_assignable_triage`, `is_assignable_mapping` e a validação de atribuibilidade.
- O Apêndice C passa a ser a referência do RBAC configurável; a ADR-0006/0014 continuam válidas e são estendidas por esta ADR.
- A troca do frontend para chaves é uma release coordenada, com a tabela da § 14.5.

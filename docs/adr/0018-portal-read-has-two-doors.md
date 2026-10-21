---
status: aceito
---

# A leitura do portal tem duas portas: pública e administrativa

No legado, `GET /portal-config` era **público** — a rota era montada antes do `authMiddleware` — e só os PATCH exigiam Administrador. O frontend consome essa leitura em **toda** requisição, inclusive anônima: o hook raiz do SvelteKit carrega a configuração antes de qualquer coisa (`hooks.server.ts`), a página pública de abertura decide se exige sessão a partir do `solicitation_mode`, o formulário público precisa da lista de categorias para o solicitante escolher, e a página de acompanhamento precisa do status público para o badge e para saber se a solicitação foi encerrada.

Quando a matriz de permissões ficou restrita, com `portal_config:read` apenas no Administrador e no Admin Root, o portal público perdeu a única via de leitura que tinha. Decidimos separar a leitura em **duas portas, com duas audiências**.

A **leitura pública** não exige autenticação e devolve apenas o que o solicitante pode ver antes de ter conta: `platform_name`, `solicitation_mode`, `protocol_mask`, a Aparência vigente com os seus assets, as **categorias ativas** e os **status com `is_public = true`**. A **leitura administrativa** é presa a `portal_config:read` e devolve o conjunto completo, incluindo os status internos e restritos e os pesos de priorização.

## Alternativas consideradas

- **Uma leitura só, com a resposta dependente do perfil.** O endpoint decide o formato pelo perfil de quem pergunta. É o que o frontend já consome hoje — e é a pior opção para um contrato: a mesma URL devolve duas formas, e o cliente precisa saber de qual delas está falando.
- **O portal público não lê o backend para o bootstrap.** Modo de acesso, nome da plataforma e aparência chegariam pelo build ou pelo deploy do frontend. Tira a fonte da verdade do banco, e a troca de "Modo de acesso" — que é uma configuração do produto — passaria a exigir um deploy.
- **Tudo público, como o legado.** Mantém o frontend intacto, mas expõe ao anônimo o catálogo de status internos, os pesos de priorização e a configuração completa — e `portal_config:read` deixa de significar alguma coisa.

## Consequências

- O payload público deixa de carregar os status internos. É uma **mudança de contrato** no frontend, e ela é o ponto da decisão: o `statuses.is_public` existe justamente para separar o que o solicitante vê do que ele não vê.
- Os dois status terminais do ciclo são públicos, então o cálculo de "solicitação encerrada" na página de acompanhamento continua funcionando com o payload enxuto.
- O Gestor não tem `portal_config:read` — a leitura administrativa é do Administrador e do Admin Root.
- A consulta de status pelo nome continua disponível: `requests.last_public_status_id` aponta para um status que, por definição, é público.

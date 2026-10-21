---
status: aceito
---

# O Gestor é somente-leitura, exceto a nota interna

O legado é internamente contraditório sobre o perfil **Gestor**. Ele é barrado explicitamente na troca de status — `requests.service.ts` responde `403` com a mensagem *"perfil Gestor é somente leitura"* — e na atribuição de responsável (*"Gestor não atribui (403 no service)"*). Mas o mesmo legado o deixa **editar qualquer solicitação** (`updateInternalRequest` só restringe o Analista) e **escrever notas internas** (o router de notas internas exige `requireRole("Analista", "Gestor", "Administrador")` e não há gate de serviço). O modelo novo precisava escolher, e o Apêndice B do modelo de dados apresentava a matriz de permissões como herança do legado — o que não era verdade.

Decidimos que **o Gestor tem somente leitura** sobre solicitação, triagem, mapeamento, priorização, pendência e configuração do portal. A **única escrita que lhe cabe é a nota interna**: ela é comunicação do time sobre a solicitação, não uma alteração do seu estado. Ele não atribui responsável, não muda status e não lê a configuração do portal.

## Alternativas consideradas

- **Preservar o legado tal como está** — devolver `request:write` e `internal_note:write` ao Gestor. Mantém a capacidade de fato, mas obriga a regra de custódia a conviver com um gestor que edita o que quiser, e reintroduz a contradição do legado.
- **Decidir rota a rota**, com o legado como fonte. É mais fiel, mas a decisão por rota é a mesma decisão por papel com mais passos — e o legado não é confiável como fonte, porque ele mesmo se contradiz.
- **Gestor totalmente sem escrita**, inclusive sem nota interna. Fica limpo demais: um gestor que não comunica nada por escrito é um gestor que perde o contexto por onde o time passou.

## Consequências

- Com o Gestor fora da escrita, a **custódia** do Analista é a única via de escrita sobre a solicitação — e por isso a chave `request:assign` continua restrita a quem já é responsável.
- O legado perde a edição pelo Gestor. Quem edita uma solicitação em nome da gestão é o Administrador.

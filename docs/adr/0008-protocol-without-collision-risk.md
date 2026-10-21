---
status: aceito
---

# Protocolo sem risco de colisão

O protocolo é o identificador público que o solicitante usa para acompanhar a solicitação. O backend legado o deriva por uma cifra de Feistel sobre o id numérico da solicitação — o que é uma bijeção e portanto nunca colide — mas obtém esse id com `SELECT nextval(...)`, SQL exclusivo do Postgres. A proposta inicial do backend novo trocava a Feistel por HMAC sobre o UUID, o que quebrou as duas propriedades: deixou de ser bijetivo e, por ser determinístico, tornava o retry de colisão um laço que jamais poderia dar certo.

Pior que a colisão em si: no legado, `GET /requests/:protocol` em modo público **não verifica o dono** — a checagem só roda quando a requisição está autenticada — e a busca usa `.first()`. Duas solicitações com o mesmo protocolo significam que o titular de uma enxerga os dados da outra, incluindo o e-mail do solicitante.

Decidimos manter a **cifra de Feistel** e trocar apenas a origem do inteiro: um **contador em tabela** (`code_counters`, uma linha por domínio), incrementado dentro da mesma transação do insert com `UPDATE` + `SELECT` — SQL idêntico em Postgres, MySQL e SQLite, sem `RETURNING`, sem `FOR UPDATE` e sem branch de dialeto. A Feistel continua sendo uma bijeção sobre `[0, 2⁴⁰)`, então **colisão é impossível por construção**, e o `UNIQUE` em `protocol` passa a ser belt-and-braces.

A leitura por protocolo deixa de usar `.first()` e passa a fazer uma **sondagem com `LIMIT 2`** que falha explicitamente quando duas linhas correspondem. E o identificador público passa a ter defesa contra enumeração: 40 bits são enumeráveis em ~127 dias a 100k rps.

## Alternativas consideradas

- **HMAC sobre o UUID, com retry.** Determinístico: o retry sobre o mesmo id devolve o mesmo código, então a colisão virava erro permanente. Corrigir com nonce aleatório resolveria, mas a garantia passaria a ser probabilística. Rejeitado.
- **Base62 em vez de base32 (48 bits).** O frontend aceita `[A-Za-z0-9]`, mas o collation padrão do MySQL é case-insensitive: `MAAT-abcd` e `MAAT-ABCD` seriam a mesma chave no MySQL e chaves diferentes no Postgres — três engines, três semânticas de busca. Misturar maiúsculas em URL também quebra em clientes que normalizam. Rejeitado.
- **Espaço maior no prefixo (`MAAT3K7P-ABCD-EFGH`, 80 bits).** O regex do frontend já permite prefixo de 1 a 10 caracteres, então é **sem mudança no frontend**. Fica registrado como pendência (§ 21 do [`03-Data-Model.md`](../03-Data-Model.md#21-pendências)) porque altera o formato exibido ao usuário.
- **Inserir id autoincrement e gerar o protocolo depois.** Reintroduz o id inteiro do banco e um segundo `UPDATE` por insert, sem ganho sobre o contador.
- **Resolver colisão na leitura (detectar duplicata ao buscar).** Converte uma invariante do modelo em verificação de runtime — exatamente como vazamentos entre inquilinos acontecem. Rejeitado.

## Consequências

- O protocolo é garantidamente único; a chance de `protocol_collision` é zero, e o retry some do código.
- O banco ganha uma tabela `code_counters` com uma linha quente por domínio. O custo é de uma escrita a mais por insert — irrelevante na carga deste portal, relevante se um dia o volume mudar.
- **O contador nunca pode ser resetado nem renumerado**, e o limite de domínio (`< 2⁴⁰`) precisa ser verificado na geração.
- O ponto de troca do contador fica explícito: a porta `Counter` permite que ele vire um `INCR` do Redis sem alterar o gerador, se a escala ou a disponibilidade exigir.
- O `Counter` entra como costura de testabilidade: em teste, o protocolo é previsível.
- A busca por protocolo custa o mesmo e passa a ser segura por construção: `LIMIT 2` transforma uma violação de invariante em erro explícito em vez de dados de outra solicitação.
- Com 40 bits, a defesa contra enumeração não é criptográfica — é o rate limit do endpoint público e a exigência de identidade. O prefixo de 80 bits continua registrado como pendência.

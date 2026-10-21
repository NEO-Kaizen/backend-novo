---
status: aceito
---

# A Prioridade da solicitação tem uma casa só

O modelo novo guardava a faixa de criticidade em **duas** colunas: `requests.priority_id` (nulável, FK → `prioritization.priorities.id`) e `prioritization_evaluations.priority_id` (NOT NULL, FK → a mesma tabela, com `request_id` UNIQUE — ou seja, exatamente uma avaliação corrente por solicitação). Duas colunas, dois domínios, nenhuma constraint que impedisse a divergência — e a § 2.7 do modelo de dados proíbe, desde o começo, que o mesmo conjunto seja armazenado duas vezes como coluna de classificação.

O problema não era só a redundância: pelo ADR-0004 cada domínio é dono das suas tabelas, e a faixa é dado de referência do domínio `prioritization`. Uma cópia em `requests` significaria que o `prioritization` escreve na tabela do `requests` — ou que a aplicação orquestra os dois domínios por fora, com uma janela em que as duas colunas discordam.

Decidimos que **a faixa vive só em `prioritization_evaluations.priority_id`**, e que `requests.priority_id` sai, junto com o seu índice. A prioridade de uma solicitação é lida pela porta `PrioritizationReader` ou por join — exatamente como a fila já faz com o resto dos domínios.

## Alternativas consideradas

- **Faixa em `requests`, avaliação só com o score.** A fila, que é o caminho mais lido, não faria join. Mas obriga o domínio `prioritization` a escrever em `requests`, invertendo a fronteira do ADR-0004 — e o doc daria ao `requests` a posse de um dado que é do `prioritization`.
- **Manter as duas, com `requests.priority_id` como cache.** Seria uma regra de sincronização ("grava a avaliação primeiro, depois a coluna"), sem garantia de banco. É o tipo de convenção que sobrevive até a primeira exceção — e a primeira exceção não tem onde ser registrada.
- **Tirar a faixa da tabela de faixas e guardar o rótulo como texto.** Já foi o que o legado fazia, com `ENUM` nativo duplicado. Volta ao problema original.

## Consequências

- Uma reavaliação escreve **uma** linha, em um domínio só. Não há estado em que as duas cópias discordem.
- A § 3 do modelo de dados mapeia Prioridade → `prioritization.prioritization_evaluations.priority_id`.
- O diagrama de entidades perde a aresta `PRIORITIES ||--o{ REQUESTS`.
- A fila e o dashboard leem a prioridade pela porta do `prioritization`; quem precisar do valor direto faz join com `prioritization_evaluations`.
- Nenhuma tabela fora do domínio `prioritization` guarda a faixa — nem cópia, nem rótulo em texto.

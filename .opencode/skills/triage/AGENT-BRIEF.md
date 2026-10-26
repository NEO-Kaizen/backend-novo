# Writing Agent Briefs

An agent brief is a structured comment posted on a GitHub issue or PR when it moves to `ready-for-agent`. It is the authoritative specification that an AFK agent will work from. The original body and discussion are context: the agent brief is the contract.

The brief states **what the agent should do**, which stretches to both surfaces: for an issue, that's building the change from nothing; for a PR, it's what's left to do _to the existing diff_: finish it, close gaps, address review points. Same principles either way; the PR example below shows the difference.

Output language: Portuguese.

## Principles

### Durability over precision

The issue may sit in `ready-for-agent` for days or weeks. The codebase will change in the meantime. Write the brief so it stays useful even as files are renamed, moved, or refactored.

- **Do** describe interfaces, types, and behavioral contracts
- **Do** name specific types, function signatures, or config shapes that the agent should look for or modify
- **Don't** reference file paths: they go stale
- **Don't** reference line numbers
- **Don't** assume the current implementation structure will remain the same

### Behavioral, not procedural

Describe **what** the system should do, not **how** to implement it. The agent will explore the codebase fresh and make its own implementation decisions.

- **Good:** "The `SkillConfig` type should accept an optional `schedule` field of type `CronExpression`"
- **Bad:** "Open src/types/skill.ts and add a schedule field on line 42"
- **Good:** "When a user runs `/triage` with no arguments, they should see a summary of issues needing attention"
- **Bad:** "Add a switch statement in the main handler function"

### Complete acceptance criteria

The agent needs to know when it's done. Every agent brief must have concrete, testable acceptance criteria. Each criterion should be independently verifiable.

- **Good:** "Running `gh issue list --label needs-triage` returns issues that have been through initial classification"
- **Bad:** "Triage should work correctly"

### Explicit scope boundaries

State what is out of scope. This prevents the agent from gold-plating or making assumptions about adjacent features.

## Template

```markdown
## Briefing do agente

**Categoria:** bug / enhancement
**Resumo:** descrição em uma linha do que precisa acontecer

**Comportamento atual:**
Descreva o que acontece agora. Para bugs, este é o comportamento quebrado.
Para enhancements, este é o status quo sobre o qual a funcionalidade será construída.

**Comportamento desejado:**
Descreva o que deve acontecer depois que o trabalho do agente estiver concluído.
Seja específico sobre casos de borda e condições de erro.

**Interfaces-chave:**

- `TypeName`: o que precisa mudar e por quê
- Tipo de retorno de `functionName()`: o que retorna agora vs o que deveria retornar
- Formato de configuração: quaisquer novas opções de configuração necessárias

**Critérios de aceite:**

- [ ] Critério específico e testável 1
- [ ] Critério específico e testável 2
- [ ] Critério específico e testável 3

**Fora de escopo:**

- Coisa que NÃO deve ser alterada ou abordada nesta issue
- Funcionalidade adjacente que pode parecer relacionada, mas é separada
```

## Examples

### Good agent brief (bug)

```markdown
## Briefing do agente

**Categoria:** bug
**Resumo:** O truncamento da descrição da skill corta no meio da palavra, produzindo saída quebrada

**Comportamento atual:**
Quando uma descrição de skill excede 1024 caracteres, ela é truncada em exatamente
1024 caracteres, independentemente dos limites de palavra. Isso produz descrições
que terminam no meio da palavra (por exemplo, "Use when the user wants to confi").

**Comportamento desejado:**
O truncamento deve quebrar no último limite de palavra antes de 1024 caracteres
e acrescentar "..." para indicar o truncamento.

**Interfaces-chave:**

- O campo `description` do tipo `SkillMetadata`: nenhuma mudança de tipo é necessária,
  mas a lógica de validação/processamento que o preenche precisa respeitar
  os limites de palavra
- Qualquer função que leia o frontmatter de SKILL.md e extraia a descrição

**Critérios de aceite:**

- [ ] Descrições com menos de 1024 caracteres permanecem inalteradas
- [ ] Descrições com mais de 1024 caracteres são truncadas no último limite de palavra
      antes de 1024 caracteres
- [ ] Descrições truncadas terminam com "..."
- [ ] O comprimento total, incluindo "...", não excede 1024 caracteres

**Fora de escopo:**

- Alterar o próprio limite de 1024 caracteres
- Suporte a descrições em várias linhas
```

### Good agent brief (enhancement)

```markdown
## Briefing do agente

**Categoria:** enhancement
**Resumo:** Adicionar suporte ao diretório `.out-of-scope/` para registrar solicitações de funcionalidades rejeitadas

**Comportamento atual:**
Quando uma solicitação de funcionalidade é rejeitada, a issue é fechada com o label `wontfix`
e um comentário. Não há registro persistente da decisão nem do raciocínio.
Solicitações semelhantes futuras exigem que o mantenedor se lembre ou procure
a discussão anterior.

**Comportamento desejado:**
Solicitações de funcionalidades rejeitadas devem ser documentadas em arquivos
`.out-of-scope/<conceito>.md` que capturem a decisão, o raciocínio e links para todas as issues que
solicitaram a funcionalidade. Ao triar novas issues, esses arquivos devem ser
consultados em busca de correspondências.

**Interfaces-chave:**

- Formato do arquivo Markdown em `.out-of-scope/`: cada arquivo deve ter um
  título `# Nome do conceito`, uma linha `**Decisão:**`, uma linha `**Motivo:**`
  e uma lista `**Solicitações anteriores:**` com links para as issues
- O fluxo de triagem deve ler todos os arquivos `.out-of-scope/*.md` cedo
  e comparar as issues recebidas com eles por semelhança de conceito

**Critérios de aceite:**

- [ ] Fechar uma funcionalidade como wontfix cria/atualiza um arquivo em `.out-of-scope/`
- [ ] O arquivo inclui a decisão, o raciocínio e o link para a issue fechada
- [ ] Se já existir um arquivo `.out-of-scope/` correspondente, a nova issue é
      acrescentada à lista "Solicitações anteriores" em vez de criar uma duplicata
- [ ] Durante a triagem, os arquivos `.out-of-scope/` existentes são consultados e exibidos
      quando uma nova issue corresponde a uma rejeição anterior

**Fora de escopo:**

- Correspondência automatizada (um humano confirma a correspondência)
- Reabrir funcionalidades rejeitadas anteriormente
- Relatos de bug (apenas rejeições de enhancement vão para `.out-of-scope/`)
```

### Good agent brief (PR)

For a PR, "Current behavior" describes the state of the diff, and the brief asks the agent to finish or fix it rather than build from scratch.

```markdown
## Briefing do agente

**Categoria:** enhancement
**Resumo:** Finalizar a flag de saída `--json` do contribuidor para `triage list`

**Comportamento atual:**
A PR adiciona uma flag `--json` que serializa a lista de issues em JSON. O caminho
feliz funciona e o diff corresponde à estrutura de comandos do projeto. Restam duas lacunas:
erros ainda são impressos como texto humano (não JSON), e a nova flag não tem
cobertura de teste.

**Comportamento desejado:**
Com `--json`, toda a saída (incluindo erros) é JSON bem formado em stdout,
e os códigos de saída do comando permanecem inalterados. A saída legível por humanos
existente não é alterada quando a flag está ausente.

**Interfaces-chave:**

- O caminho de erro do comando deve emitir `{ "error": string }` sob `--json`
  em vez do erro em texto simples
- Reutilize o serializador existente que a PR já adicionou; não introduza um segundo

**Critérios de aceite:**

- [ ] `triage list --json` emite JSON válido para os casos de sucesso e de erro
- [ ] Os códigos de saída correspondem aos do comando sem JSON
- [ ] Um teste cobre a saída de sucesso de `--json` e um caso de erro
- [ ] A saída padrão (sem JSON) permanece idêntica byte a byte

**Fora de escopo:**

- Adicionar `--json` a qualquer outro comando
- Alterar o formato JSON do payload de sucesso que a PR já definiu
```

### Bad agent brief

```markdown
## Briefing do agente

**Resumo:** Corrigir o bug do triage

**O que fazer:**
A coisa do triage está quebrada. Olhe o arquivo principal e corrija.
A função por volta da linha 150 tem o problema.

**Arquivos a alterar:**

- src/triage/handler.ts (linha 150)
- src/types.ts (linha 42)
```

This is bad because:

- No category
- Vague description ("the triage thing is broken")
- References file paths and line numbers that will go stale
- No acceptance criteria
- No scope boundaries
- No description of current vs desired behavior

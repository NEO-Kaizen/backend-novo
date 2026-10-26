---
status: aceito
---

# Dependências de serviço são recortes de capacidade

A injeção manual ([ADR-0002](./0002-manual-dependency-injection.md)) faz o objeto de dependências atravessar container → fábrica → construtor, e o primeiro desenho montava `new RequestService({ ...dependencies, repository })` com `dependencies: RequestsModuleDependencies`, que estende `ModuleDependencies` — e esse objeto carrega `database`. O service passava a ter a **capacidade** de falar com o banco, mesmo sem precisar: podia montar query, e o tipo dizia que podia. A regra "SQL no repositório" ficava na disciplina: `assertInTransaction()` só barra a escrita que passa pelo repositório, e um service com a porta `Database` ainda podia usar `client` para escrever fora dele.

Decidimos que as dependências são um **recorte por quem as usa**, em três níveis:

- `ServiceDependencies` — os cinco transversais (`logger`, `clock`, `ids`, `transactions`, `events`). É o que `BaseService` usa para implementar `execute`, `readSnapshot` e os acessores.
- `UseCaseDependencies extends ServiceDependencies` — acrescenta `authorization`, que a regra fina do [§ 14.4](../02-Architecture.md#144-autorização) aplica no service que autoriza.
- `ModuleDependencies extends UseCaseDependencies` — acrescenta `database`, que a fábrica repassa ao repositório; o service não o recebe.

O `audit` usa o recorte de caso de uso: a leitura aplica `audit:read` ([§ 14.5](../02-Architecture.md#145-compatibilidade-com-o-frontend-atual)).

O service declara o próprio `XServiceDependencies`, e a fábrica retira o banco antes do construtor:

```ts
const { database, ...serviceDependencies } = dependencies;
const service = new RequestService({ ...serviceDependencies, repository });
```

Com isso, `this.dependencies.database` não compila: o service não recebe a porta `Database`. A garantia é do **tipo**: em runtime a instância do adapter ainda chega como `transactions`, mas o tipo exposto é apenas `TransactionManager`.

## Alternativas consideradas

- **Manter o spread do objeto de dependências do módulo.** Menos tipos, mas a capacidade fica no service e o "não use" vira comentário. O erro honesto deixa de ser pego pelo compilador.
- **Service locator ou registro global.** Reduz o wiring e é justamente a alternativa rejeitada no [ADR-0002](./0002-manual-dependency-injection.md): esconde a dependência que se quer visível.
- **`Proxy` que lança ao ler `database`.** Garante em runtime, mas atrapalha depuração e serialização, e não pega nada além do que o tipo pega — quem chega ao `Proxy` já teve que dar cast.
- **Só lint e review.** Barato, mas não estrutural: o `any` é proibido, porém a proibição não aparece na assinatura nem no construtor.

## Consequências

- O construtor do service fica mais longo e cada service declara o próprio tipo de dependências — consequência da composição manual, já aceita no [ADR-0002](./0002-manual-dependency-injection.md).
- Adicionar dependência à base toca `ServiceDependencies` e o compilador aponta cada fábrica que não a fornece. O custo de wiring vira erro de compilação.
- Testes de service ficam menores: o fake não precisa de `database`.
- O repositório continua recebendo `Database` e continua exigindo transação corrente (`assertInTransaction()`), exceto `insertAttempt` ([§ 7.3](../02-Architecture.md#73-baserepository)). O que muda é quem **não** enxerga a porta do banco.
- O risco residual é deliberado: um service ainda pode obter o banco com `as any` ou importando `platform` — o primeiro é proibido pelo `CODING_STANDARDS.md` e o segundo pelo [§ 19](../02-Architecture.md#19-dependências-permitidas) — e ambos visíveis no review. O que se elimina é o erro sem má intenção.
- O recorte não é à prova de crescimento: um campo novo em `ModuleDependencies` atravessa o spread da fábrica sem erro de excess property check. A mitigação é declarar `XServiceDependencies` explicitamente e revisar o recorte na fábrica; o compilador só protege o que o tipo declara.
- A regra é a mesma das portas publicadas: `queue` e `reports` não escrevem porque não recebem `*Writer`; agora o banco segue a mesma lógica de capacidade.

Ver [§ 7.2](../02-Architecture.md#72-baseservice) e [§ 8.2](../02-Architecture.md#82-fábrica-de-módulo) em [`02-Architecture.md`](../02-Architecture.md).

---
status: aceito
---

# Dependências de serviço são recortes de capacidade

A injeção manual (ADR-0002) faz o objeto de dependências atravessar container → fábrica → construtor. No primeiro desenho, a fábrica montava `new RequestService({ ...dependencies, repository })` com `dependencies: RequestsModuleDependencies`, que estende `ModuleDependencies` — e esse objeto carrega `database`. O service passava a ter a **capacidade** de falar com o banco, mesmo sem precisar: podia montar query, e o tipo dizia que podia. A regra "SQL no repositório" ficava na disciplina, e a única barreira em runtime era `assertInTransaction()`, que impede escrita fora de transação, mas não impede SQL no lugar errado dentro dela.

Decidimos que as dependências são um **recorte por quem as usa**, em três níveis:

- `ServiceDependencies` — os cinco transversais (`logger`, `clock`, `ids`, `transactions`, `events`). É o que `BaseService` usa para implementar `execute`, `readOnly` e os acessores.
- `UseCaseDependencies extends ServiceDependencies` — acrescenta `authorization`, que a regra fina do §14.4 aplica no service.
- `ModuleDependencies extends UseCaseDependencies` — acrescenta `database`, que só a fábrica do módulo usa, para construir o repositório.

O service declara o próprio `XServiceDependencies`, e a fábrica retira o banco antes do construtor:

```ts
const { database, ...serviceDependencies } = dependencies;
const service = new RequestService({ ...serviceDependencies, repository });
```

Com isso, `this.dependencies.database` não compila. A garantia é do **tipo**, e a ausência em runtime é consequência de não repassar — não há mecanismo especial.

## Alternativas consideradas

- **Manter o spread do `ModuleDependencies`.** Menos tipos, mas a capacidade fica no service e o "não use" vira comentário. O erro honesto deixa de ser pego pelo compilador.
- **Service locator ou registro global.** Reduz o wiring e é justamente a alternativa rejeitada no ADR-0002: esconde a dependência que se quer visível.
- **`Proxy` que lança ao ler `database`.** Garante em runtime, mas atrapalha depuração e serialização, e não pega nada além do que o tipo pega — quem chega ao `Proxy` já teve que dar cast.
- **Só lint e review.** Barato, mas não estrutural: o `any` é proibido, porém a proibição não aparece na assinatura nem no construtor.

## Consequências

- O construtor do service fica mais longo e cada service declara o próprio tipo de dependências — consequência da composição manual, já aceita no ADR-0002.
- Adicionar dependência à base toca `ServiceDependencies` e o compilador aponta cada fábrica que não a fornece. O custo de wiring vira erro de compilação.
- Testes de service ficam menores: o fake não precisa de `database`.
- O repositório continua recebendo `Database` e continua exigindo transação corrente (`assertInTransaction()`). O que muda é quem **não** enxerga o banco.
- O risco residual é deliberado: um service ainda pode obter o banco com `as any` ou importando `platform` — proibidos pelo `CODING_STANDARDS.md` e visíveis no review. O que se elimina é o erro sem má intenção.
- A regra é a mesma das portas publicadas: `queue` e `reports` não escrevem porque não recebem `*Writer`; agora o banco segue a mesma lógica de capacidade.

Ver §7.2 e §8.2 em [`02-Architecture.md`](../02-Architecture.md).

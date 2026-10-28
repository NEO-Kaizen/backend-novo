# Testes

Os testes de contrato usam o runner nativo do Node (`node --test "test/**/*.test.ts"`); a escolha do runner definitivo para a suíte completa segue em aberto e é issue própria.

## Costuras

As costuras de teste estão descritas em [`docs/02-Architecture.md` § 18](../docs/02-Architecture.md#18-costuras-de-testabilidade); a lista não é repetida aqui.

O app é montado por `createApp(container)` (`src/app.ts`) sem `listen`, e `loadConfig(source)` aceita um ambiente injetado.

## Como um teste deve ser escrito

- Comportamento, não implementação: nome do `describe` é a rota ou o caso de uso.
- Sem rede real e sem `sleep`; sem depender de banco, fila ou relógio real.
- Cada teste monta o próprio container (`createContainer(config)`) e o destrói no
  `after` (`container.database.destroy()`), sem estado global compartilhado.
- Config de teste: `loadConfig({ NODE_ENV: "test", … })`, sem `.env`.

O esqueleto do teste é este (porta efêmera, sem `listen` fixo):

```ts
const container = createContainer(loadConfig(testEnvironment));
const app = createApp(container);
const server = app.listen(0);
// ... requisição ...
server.close();
await container.database.destroy();
```

`npm test` roda os testes de contrato com o runner nativo do Node e o type stripping do Node 24; os arquivos de teste são `test/**/*.test.ts`.

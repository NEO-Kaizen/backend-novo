export interface TransactionManager {
  /** Transação de escrita. */
  run<T>(work: () => Promise<T>): Promise<T>;
  /** Transação de leitura com snapshot: isolamento `repeatable read` onde a engine suportar. */
  runSnapshot<T>(work: () => Promise<T>): Promise<T>;
}

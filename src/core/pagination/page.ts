// <T> significa que Page pode envelopar qualquer lista (ex: Page<Request>, Page<User>)
export interface Page<T> {
  readonly data: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}
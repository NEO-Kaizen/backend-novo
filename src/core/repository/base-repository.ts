import type { Database } from "./database.ts";
import type { Logger } from "../service/logger.ts";
import type { PageQuery } from "../pagination/page-query.ts";
import type { Page } from "../pagination/page.ts";
import { sanitizePageQuery, buildPage } from "../pagination/pagination-helper.ts";

export interface RepositoryDependencies {
  readonly database: Database;
  readonly logger: Logger;
}

export abstract class BaseRepository<TEntity, TRow extends Record<string, unknown>> {
  protected readonly database: Database;
  protected readonly logger: Logger;
  protected abstract readonly tableName: string;

  protected constructor(dependencies: RepositoryDependencies) {
    this.database = dependencies.database;
    this.logger = dependencies.logger;
  }

  /** Mapeia a linha crua do banco (TRow) para a entidade rica de domínio (TEntity) */
  protected abstract toEntity(row: TRow): TEntity;

  public async findById(id: string): Promise<TEntity | null> {
    const row = await this.database.client<TRow>(this.tableName)
      .where({ id })
      .first();

    return row ? this.toEntity(row) : null;
  }

  protected async paginate(query: PageQuery): Promise<Page<TEntity>> {
    const { page, pageSize } = sanitizePageQuery(query);
    const offset = (page - 1) * pageSize;

    const countResult = await this.database.client(this.tableName)
      .count<{ count: string | number }>({ count: "*" })
      .first();

    const total = Number(countResult?.count ?? 0);

    const rows = await this.database.client<TRow>(this.tableName)
      .select("*")
      .limit(pageSize)
      .offset(offset);

    const entities = rows.map((r) => this.toEntity(r));
    return buildPage(entities, total, page, pageSize);
  }

  /**
   * Método de escrita. Repositório exige transação aberta pelo Service.
   */
  protected async insertOne(values: Record<string, unknown>): Promise<TEntity> {
    this.database.assertInTransaction();

    await this.database.client(this.tableName).insert(values);
    return this.toEntity(values as TRow);
  }
}
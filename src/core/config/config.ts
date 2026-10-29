export type Environment = "development" | "test" | "production";

export const MEBIBYTE = 1024 * 1024;

export const DATABASE_ENGINES = ["postgres", "sqlite", "mysql"] as const;

export type DatabaseEngine = (typeof DATABASE_ENGINES)[number];

export interface DatabaseConfig {
  readonly engine: DatabaseEngine;
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password: string;
  readonly acquireTimeoutMs: number;
  readonly connectTimeoutMs: number;
  readonly statementTimeoutMs: number;
}

export interface CorsConfig {
  readonly origins: readonly string[];
}

export interface UploadConfig {
  readonly maxFileBytes: number;
  readonly maxFiles: number;
  readonly jsonBodyMaxBytes: number;
}

/** Exposição do spec e da UI de documentação (`04-HTTP-Contract.md` §13). */
export interface DocsConfig {
  readonly isEnabled: boolean;
}

/** Configuração lida e validada uma única vez no boot. */
export interface Config {
  readonly environment: Environment;
  readonly port: number;
  readonly database: DatabaseConfig;
  readonly cors: CorsConfig;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly cookieName: string;
  readonly protocolSecret: string;
  readonly uploads: UploadConfig;
  readonly docs: DocsConfig;
}

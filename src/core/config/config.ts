export type Environment = "development" | "test" | "production";

export const DATABASE_ENGINES = ["postgres", "sqlite", "mysql"] as const;

export type DatabaseEngine = (typeof DATABASE_ENGINES)[number];

export interface DatabaseConfig {
  readonly engine: DatabaseEngine;
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password: string;
}

export interface CorsConfig {
  readonly origins: readonly string[];
}

export interface UploadConfig {
  readonly maxFileBytes: number;
  readonly maxFiles: number;
  readonly jsonBodyMaxBytes: number;
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
}

import express, { Router } from "express";
import type { Express } from "express";
import { API_BASE_PATH } from "../core/http/api-base-path.ts";
import { assertRouteCoverage } from "./route-coverage.ts";

/** Sondas da própria guarda: cada caso prova que o algoritmo falha (ou passa) quando deve. */
export function runRouteCoverageProbe(): void {
  probeFailure(
    "rota sem operação",
    () => {
      const app = probeApp((router) => {
        router.get("/probe", (_req, res) => {
          res.sendStatus(204);
        });
      });

      assertRouteCoverage(app, { paths: {} });
    },
    /GET \/probe/,
  );

  probeFailure(
    "operação sem rota",
    () => {
      assertRouteCoverage(express(), { paths: { "/probe": { get: {} } } });
    },
    /Operação GET \/probe não tem rota alcançável/,
  );

  probeFailure(
    "operação em rota de infraestrutura",
    () => {
      const app = probeApp((router) => {
        router.get("/openapi.json", (_req, res) => {
          res.sendStatus(200);
        });
      });

      assertRouteCoverage(app, { paths: { "/openapi.json": { get: {} } } });
    },
    /infraestrutura/,
  );

  probeFailure(
    "parâmetros divergentes",
    () => {
      const app = probeApp((router) => {
        router.get("/probe/:id", (_req, res) => {
          res.sendStatus(200);
        });
      });

      assertRouteCoverage(app, { paths: { "/probe/{other}": { get: {} } } });
    },
    /parâmetros/,
  );

  probeFailure(
    "router.all exige todos os métodos",
    () => {
      const app = probeApp((router) => {
        router.all("/probe", (_req, res) => {
          res.sendStatus(204);
        });
      });

      assertRouteCoverage(app, { paths: {} });
    },
    /GET \/probe/,
  );

  probeSuccess("rota e operação coincidem", () => {
    const app = probeApp((router) => {
      router.get("/probe/:id", (_req, res) => {
        res.sendStatus(200);
      });
    });

    assertRouteCoverage(app, { paths: { "/probe/{id}": { get: {} } } });
  });

  probeSuccess("/health é excluída do contrato", () => {
    const app = express();
    app.get("/health", (_req, res) => {
      res.sendStatus(200);
    });

    assertRouteCoverage(app, { paths: {} });
  });
}

function probeApp(register: (router: Router) => void): Express {
  const app = express();
  const router = Router();
  register(router);
  app.use(API_BASE_PATH, router);
  return app;
}

function probeFailure(name: string, run: () => void, expected: RegExp): void {
  try {
    run();
  } catch (error) {
    const message = readMessage(error);

    if (!expected.test(message)) {
      throw new Error(`sonda "${name}": falhou com mensagem inesperada: ${message}`, {
        cause: error,
      });
    }

    return;
  }

  throw new Error(`sonda "${name}": a guarda não falhou.`);
}

function probeSuccess(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    throw new Error(`sonda "${name}": a guarda falhou indevidamente: ${readMessage(error)}`, {
      cause: error,
    });
  }
}

function readMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

declare global {
  namespace Express {
    interface Request {
      /** Id de correlação HTTP (C11). Gerado ou aceito de `x-request-id`. */
      id: string;
    }
  }
}

export {};

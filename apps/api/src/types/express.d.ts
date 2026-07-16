import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        sessionId: string;
      };
      valid?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};

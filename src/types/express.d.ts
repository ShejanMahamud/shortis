import { IJwtPayload } from '../auth/interfaces/auth.interface';

declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}

export {};

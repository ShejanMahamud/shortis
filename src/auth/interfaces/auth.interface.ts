import { User } from 'generated/prisma';

export interface IAuthResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface IUserResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    limit: number;
    count: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenService {
  generateTokens(user: User): ITokenPair;
  verifyAccessToken(token: string): Promise<IJwtPayload>;
  verifyRefreshToken(token: string): Promise<IJwtPayload>;
}

export interface IUserService {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAllUsers(
    limit: number,
    cursor?: string,
    search?: string,
  ): Promise<IUserResponse<User[]>>;
  createUser(data: any): Promise<User>;
  updateUser(id: string, data: any): Promise<User>;
  upsertUser(email: string, data: any): Promise<User>;
}

export interface IAuthService {
  loginOrCreateUser(data: any): Promise<IAuthResponse<ITokenPair>>;
  refreshTokens(refreshToken: string): Promise<IAuthResponse<ITokenPair>>;
  getCurrentUser(userId: string): Promise<IAuthResponse<User>>;
  logout(userId: string): Promise<IAuthResponse>;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

import { Prisma, User } from 'generated/prisma';
import { IApiResponse } from 'src/interfaces';

export interface IAuthResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ISessionMetadata {
  userId: string;
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
}

export interface ITokenService {
  generateTokens(user: User): ITokenPair;
  verifyAccessToken(token: string): Promise<IJwtPayload>;
  verifyRefreshToken(token: string): Promise<IJwtPayload>;
}

export interface IUserService {
  findByEmail(
    email: string,
    selectQuery?: Prisma.UserSelect,
  ): Promise<Partial<User> | null>;
  findById(
    id: string,
    selectQuery?: Prisma.UserSelect,
  ): Promise<Partial<User> | null>;
  findAllUsers(
    limit: number,
    cursor?: string,
    search?: string,
  ): Promise<IApiResponse<Partial<User>[]>>;
  createUser(data: any): Promise<Partial<User>>;
  updateUser(id: string, data: any): Promise<Partial<User>>;
  upsertUser(email: string, data: any): Promise<Partial<User>>;
}

export interface IAuthService {
  loginOrCreateUser(data: any): Promise<IAuthResponse<ITokenPair>>;
  refreshTokens(refreshToken: string): Promise<IAuthResponse<ITokenPair>>;
  getCurrentUser(userId: string): Promise<IAuthResponse<Partial<User>>>;
  logout(userId: string): Promise<IAuthResponse>;
  getActiveSessions(): Promise<string[]>;
  forceLogout(userId: string): Promise<IAuthResponse>;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

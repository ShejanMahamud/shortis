import { Prisma } from 'generated/prisma';
import { IApiResponse } from 'src/interfaces';
import {
  AccessUrlDto,
  CreateShortnerDto,
  GetAnalyticsDto,
  UpdateShortnerDto,
} from '../dto';

export interface UrlEntity {
  id: string;
  originalUrl: string;
  slug: string;
  title: string | null;
  description: string | null;
  userId: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  password: string | null;
  customDomain: string | null;
  clickLimit: number | null;
  totalClicks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMeta {
  limit: number;
  count: number;
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface ClickEntity {
  id: string;
  urlId: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  clickedAt: Date;
}

export interface AnalyticsEntity {
  id: string;
  urlId: string;
  date: Date;
  clickCount: number;
  uniqueClicks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UrlAnalytics {
  totalClicks: number;
  uniqueClicks: number;
  clicksByDate: Array<{
    date: string;
    clicks: number;
    uniqueClicks: number;
  }>;
  clicksByCountry: Array<Record<string, string | number>>;
  clicksByDevice: Array<Record<string, string | number>>;
  clicksByBrowser: Array<Record<string, string | number>>;
  clicksByReferer: Array<Record<string, string | number>>;
}

export interface CreateUrlData {
  originalUrl: string;
  customSlug?: string;
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: Date;
  customDomain?: string;
  clickLimit?: number;
  isActive?: boolean;
  userId?: string;
}

export interface UpdateUrlData {
  title?: string;
  description?: string;
  isActive?: boolean;
  expiresAt?: Date;
  clickLimit?: number;
}

export interface ClickData {
  urlId: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  referer?: string | null;
}

export interface IMinimalUrl {
  id: string;
  originalUrl: string;
  slug: string;
  password?: string | null;
  isActive: boolean;
  expiresAt?: Date | null;
  clickLimit?: number | null;
  totalClicks: number;
  clickCount?: number; // Add missing field
  userId?: string | null; // Add missing field
  hasPassword?: boolean; // Add missing field
}

export interface IShortnerService {
  create(
    createShortnerDto: CreateShortnerDto,
    userId?: string,
  ): Promise<IApiResponse<UrlEntity>>;
  findAll(
    limit: number,
    cursor?: string,
    userId?: string,
    query?: Omit<Prisma.UrlFindUniqueArgs, 'where'>,
  ): Promise<IApiResponse<UrlEntity[], IMeta>>;
  findOne(
    id: string,
    userId?: string,
    query?: Omit<Prisma.UrlFindUniqueArgs, 'where'>,
  ): Promise<IApiResponse<UrlEntity>>;
  findBySlug(
    slug: string,
    query?: Omit<Prisma.UrlFindUniqueArgs, 'where'>,
  ): Promise<IApiResponse<UrlEntity>>;
  redirectToUrl(
    slug: string,
    accessDto?: AccessUrlDto,
    ipAddress?: string,
    userAgent?: string,
    referer?: string,
    userId?: string,
  ): Promise<string>;
  generateQrCode(url: string, slug: string): Promise<Buffer>;
  update(
    id: string,
    updateShortnerDto: UpdateShortnerDto,
    userId?: string,
    query?: Omit<Prisma.UrlFindUniqueArgs, 'where'>,
  ): Promise<IApiResponse<UrlEntity>>;
  remove(
    id: string,
    userId?: string,
  ): Promise<IApiResponse<{ success: boolean; message: string }>>;
  getAnalytics(
    id: string,
    analyticsDto: GetAnalyticsDto,
    userId?: string,
  ): Promise<IApiResponse<UrlAnalytics>>;
  toggleUrlStatus(
    id: string,
    userId?: string,
  ): Promise<IApiResponse<UrlEntity>>;
}

export interface IValidationService {
  validateUrl(url: string): boolean;
  validateExpirationDate(date?: Date): boolean;
  generateSlug(length: number): string;
  validateUrlAccess(url: UrlEntity, password?: string): Promise<void>;
  generateUniqueSlug(customSlug?: string): Promise<string>;
  checkSlugExists(slug: string): Promise<boolean>;
}

export interface IUrlValidationService {
  validateUrlCreation(userId: string): Promise<boolean>;
  consumeUrlCreation(userId: string): Promise<void>;
  validateUrlAccess(
    slug: string,
    password?: string,
    userIp?: string,
  ): Promise<IMinimalUrl>;
  validateUrlUpdate(userId: string, urlId: string): Promise<boolean>;
  clearUrlCache(slug: string): Promise<void>;
}

export interface IAnalyticsService {
  getUrlAnalytics(
    urlId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IApiResponse<UrlAnalytics>>;
  recordClick(
    urlId: string,
    userId: string | null,
    ipAddress: string | null,
    userAgent: string | null,
    referer: string | null,
  ): Promise<void>;
}

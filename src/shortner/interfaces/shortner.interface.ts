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

export interface IApiResponse<T = any, Q = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Q;
}

import * as argon from 'argon2';
import { randomBytes } from 'crypto';
export class Util {
  public static isValidUrl(url: string): boolean {
    const regex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
    return regex.test(url);
  }
  public static async hash(password: string): Promise<string> {
    return await argon.hash(password);
  }
  public static async match(hash: string, password: string): Promise<boolean> {
    return await argon.verify(hash, password);
  }
  public static generateRandomString(length: number): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  }

  public static generateRandomBytes(length: number): Buffer {
    return randomBytes(length).toString('hex') as unknown as Buffer;
  }
}

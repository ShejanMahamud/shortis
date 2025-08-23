import { UnauthorizedException } from '@nestjs/common';

export class InvalidTokenException extends UnauthorizedException {
  constructor(message = 'Invalid or expired token') {
    super(message);
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor(message = 'Token has expired') {
    super(message);
  }
}

export class RefreshTokenMismatchException extends UnauthorizedException {
  constructor(message = 'Refresh token does not match') {
    super(message);
  }
}

export class UserInactiveException extends UnauthorizedException {
  constructor(message = 'User account is inactive') {
    super(message);
  }
}

import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';

export class InvalidUrlException extends BadRequestException {
  constructor(message = 'Invalid URL provided') {
    super(message);
  }
}

export class UrlNotFoundException extends NotFoundException {
  constructor(message = 'URL not found') {
    super(message);
  }
}

export class SlugAlreadyExistsException extends ConflictException {
  constructor(slug: string) {
    super(`Slug '${slug}' is already taken`);
  }
}

export class UrlExpiredException extends ForbiddenException {
  constructor(message = 'This URL has expired') {
    super(message);
  }
}

export class UrlInactiveException extends ForbiddenException {
  constructor(message = 'This URL is inactive') {
    super(message);
  }
}

export class ClickLimitExceededException extends ForbiddenException {
  constructor(message = 'Click limit exceeded for this URL') {
    super(message);
  }
}

export class PasswordRequiredException extends UnauthorizedException {
  constructor(message = 'Password required to access this URL') {
    super(message);
  }
}

export class IncorrectPasswordException extends UnauthorizedException {
  constructor(message = 'Incorrect password provided') {
    super(message);
  }
}

export class UnauthorizedUrlAccessException extends ForbiddenException {
  constructor(message = 'Unauthorized to access this URL') {
    super(message);
  }
}

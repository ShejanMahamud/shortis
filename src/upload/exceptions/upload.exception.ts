import { RequestTimeoutException } from '@nestjs/common';

export class UploadRequestTimeout extends RequestTimeoutException {
  constructor(message: string = 'Upload request timed out') {
    super(message);
  }
}

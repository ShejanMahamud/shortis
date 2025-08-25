import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { fileTypeFromBuffer, FileTypeResult } from 'file-type';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Util } from 'src/utils/util';
import { IUploadService } from './interfaces';

@Injectable()
export class UploadService implements IUploadService {
  constructor(
    //inject bullmq service
    @InjectQueue('uploader') private readonly uploadQueue: Queue,
  ) {}

  //file uploader queue method
  public async enqueueUpload(fileBuffer: Buffer, slug: string): Promise<void> {
    const fileType: FileTypeResult | undefined =
      await fileTypeFromBuffer(fileBuffer);
    if (!fileType || !fileType.mime.startsWith('image/')) {
      throw new BadRequestException('Invalid or unsupported file type!');
    }
    //check mime type
    if (!['image/png'].includes(fileType.mime)) {
      throw new BadRequestException('Mime type not supported');
    }
    //create tmp dir
    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, this.generateFileName(slug));
    //stream the file
    fs.writeFileSync(tmpFilePath, fileBuffer);

    // Add job to upload queue
    await this.uploadQueue.add('upload-image', {
      filePath: tmpFilePath,
      mimeType: fileType.mime,
      slug,
    });
  }

  //generate unique filenames
  private generateFileName(fileName: string): string {
    const uuid = Util.generateRandomString(16);
    const ext = path.extname(fileName);
    return `${Date.now()}-${uuid}${ext}`;
  }
}

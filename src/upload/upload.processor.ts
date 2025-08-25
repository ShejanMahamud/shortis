import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadRequestTimeout } from './exceptions';
import { IUploadProcessor } from './interfaces';

@Processor('uploader')
export class UploadProcessor extends WorkerHost implements IUploadProcessor {
  constructor(
    //inject cloudinary service
    @Inject('CLOUDINARY') private readonly cloudinaryService: typeof cloudinary,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(
    job: Job<{
      filePath: string;
      mimeType: string;
      slug: string;
    }>,
  ): Promise<string> {
    const { data } = job;

    try {
      const result = await this.cloudinaryService.uploader.upload(
        data.filePath,
        {
          public_id: data.filePath.split('.')[0],
          folder: this.config.get<string>('CLOUDINARY_UPLOAD_FOLDER'),
          resource_type: 'image',
          transformation: [
            { width: 500, height: 500, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
      );
      // Clean up temporary file
      fs.unlinkSync(data.filePath);
      await this.prisma.url.update({
        where: { slug: data.slug },
        data: { qrCode: result.secure_url },
      });
      return result.secure_url;
    } catch (error: any) {
      // Clean up temporary file even on error
      if (fs.existsSync(data.filePath)) {
        fs.unlinkSync(data.filePath);
      }
      throw new UploadRequestTimeout((error as Error).message);
    }
  }
}

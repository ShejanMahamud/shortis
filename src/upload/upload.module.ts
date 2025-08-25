import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadProcessor } from './upload.processor';
import { UploadService } from './upload.service';

@Module({
  imports: [],
  providers: [
    UploadService,
    UploadProcessor,
    {
      provide: 'CLOUDINARY',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        cloudinary.config({
          cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME') as string,
          api_key: config.get<string>('CLOUDINARY_API_KEY') as string,
          api_secret: config.get<string>('CLOUDINARY_API_SECRET') as string,
        });
        return cloudinary;
      },
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}

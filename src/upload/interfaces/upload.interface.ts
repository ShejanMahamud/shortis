import { Job } from 'bullmq';

export interface IUploadService {
  enqueueUpload(fileBuffer: Buffer, slug: string): Promise<void>;
}

export interface IUploadProcessor {
  process(job: Job): Promise<string>;
}

export interface IUploadJob {
  filePath: string;
  mimeType: string;
  slug: string;
}

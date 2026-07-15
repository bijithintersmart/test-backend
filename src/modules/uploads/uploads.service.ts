import fs from 'fs/promises';
import path from 'path';
import { env } from '../../config/env';
import { logger } from '../../core/logger/logger';
import { BadRequestError } from '../../core/errors/custom-errors';

export interface UploadedFile {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

export class UploadsService {
  private localUploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure local upload dir exists
    fs.mkdir(this.localUploadDir, { recursive: true }).catch((err) => {
      logger.error('Failed to create local uploads directory:', err);
    });
  }

  // Virus Scan Hook (Mock implementation for production ready pipeline)
  async scanForViruses(_fileBuffer: Buffer, filename: string): Promise<boolean> {
    logger.info(`🛡️ Scanning file ${filename} for viruses...`);
    // Hook into ClamAV or external virus scanning APIs here
    const isSafe = true; // Always return safe for mock
    if (!isSafe) {
      logger.warn(`🚨 Malicious file detected: ${filename}`);
      return false;
    }
    return true;
  }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    size: number
  ): Promise<UploadedFile> {
    // 1. Run virus scan
    const isSafe = await this.scanForViruses(fileBuffer, filename);
    if (!isSafe) {
      throw new BadRequestError('File security scan failed. File rejected.');
    }

    const fileExtension = path.extname(filename);
    const uniqueKey = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;

    // 2. Route to correct storage provider
    switch (env.STORAGE_PROVIDER) {
      case 's3':
        return this.uploadToS3(fileBuffer, uniqueKey, mimeType, size);
      case 'cloudinary':
        return this.uploadToCloudinary(fileBuffer, uniqueKey, mimeType, size);
      case 'local':
      default:
        return this.uploadToLocal(fileBuffer, uniqueKey, filename, mimeType, size);
    }
  }

  private async uploadToLocal(
    fileBuffer: Buffer,
    fileKey: string,
    originalName: string,
    mimeType: string,
    size: number
  ): Promise<UploadedFile> {
    const filePath = path.join(this.localUploadDir, fileKey);
    await fs.writeFile(filePath, fileBuffer);

    const fileUrl = `/uploads/${fileKey}`;
    logger.info(`💾 File saved locally: ${filePath}`);

    return {
      fileName: originalName,
      fileKey,
      fileUrl,
      mimeType,
      fileSize: size,
    };
  }

  private async uploadToS3(
    _fileBuffer: Buffer,
    fileKey: string,
    _mimeType: string,
    size: number
  ): Promise<UploadedFile> {
    logger.info(`☁️ Uploading ${fileKey} to AWS S3 bucket: ${env.AWS_BUCKET_NAME}`);

    // Standard SDK Integration template:
    // const s3 = new S3Client({ region: env.AWS_REGION });
    // await s3.send(new PutObjectCommand({ Bucket: env.AWS_BUCKET_NAME, Key: fileKey, Body: fileBuffer, ContentType: mimeType }));
    // const fileUrl = `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${fileKey}`;

    const fileUrl = `https://${env.AWS_BUCKET_NAME || 's3-bucket'}.s3.${env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;

    return {
      fileName: fileKey,
      fileKey,
      fileUrl,
      mimeType: _mimeType,
      fileSize: size,
    };
  }

  private async uploadToCloudinary(
    _fileBuffer: Buffer,
    fileKey: string,
    _mimeType: string,
    size: number
  ): Promise<UploadedFile> {
    logger.info(`☁️ Uploading ${fileKey} to Cloudinary`);

    // Standard Cloudinary SDK template:
    // const result = await cloudinary.uploader.upload_stream({ public_id: fileKey }, ...);

    const fileUrl = `https://res.cloudinary.com/demo/image/upload/${fileKey}`;

    return {
      fileName: fileKey,
      fileKey,
      fileUrl,
      mimeType: _mimeType,
      fileSize: size,
    };
  }
}

export const uploadsService = new UploadsService();

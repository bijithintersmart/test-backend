import { Request, Response, NextFunction } from 'express';
import { uploadsService } from './uploads.service';
import { db } from '../../database/db';
import { sendSuccess } from '../../core/utils/response';
import { BadRequestError } from '../../core/errors/custom-errors';

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/x-matroska', 'video/x-msvideo', 'video/quicktime'],
  document: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

const MAX_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  video: 50 * 1024 * 1024, // 50MB
  document: 10 * 1024 * 1024, // 10MB
};

export class UploadsController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequestError('No file uploaded');
      }

      // Detect file category based on MIME type prefix
      let category: 'image' | 'video' | 'document' | null = null;
      if (ALLOWED_MIME_TYPES.image.includes(file.mimetype)) {
        category = 'image';
      } else if (ALLOWED_MIME_TYPES.video.includes(file.mimetype)) {
        category = 'video';
      } else if (ALLOWED_MIME_TYPES.document.includes(file.mimetype)) {
        category = 'document';
      }

      if (!category) {
        throw new BadRequestError('Invalid file type. Only standard images, videos, and documents are allowed.');
      }

      // Validate file size
      if (file.size > MAX_SIZES[category]) {
        throw new BadRequestError(
          `File size exceeds the limit of ${MAX_SIZES[category] / (1024 * 1024)}MB for ${category}s`
        );
      }

      // Upload file to active storage provider
      const result = await uploadsService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        file.size
      );

      // Save upload logs in database
      const uploadRecord = await db.upload.create({
        data: {
          userId: req.user!.id,
          fileName: result.fileName,
          fileKey: result.fileKey,
          fileUrl: result.fileUrl,
          mimeType: result.mimeType,
          fileSize: result.fileSize,
          provider: env.STORAGE_PROVIDER || 'local',
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'File uploaded successfully',
        data: uploadRecord,
      });
    } catch (error) {
      return next(error);
    }
  }
}

// Access environment variables cleanly
import { env } from '../../config/env';

export const uploadsController = new UploadsController();

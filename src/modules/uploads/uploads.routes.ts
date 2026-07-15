import { Router } from 'express';
import multer from 'multer';
import { uploadsController } from './uploads.controller';
import { authenticate } from '../../core/middleware/auth.middleware';

const router = Router();

// Multer memory storage config
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  authenticate,
  upload.single('file'),
  uploadsController.upload
);

export default router;

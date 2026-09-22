import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Request } from 'express';
import { memoryStorage } from 'multer';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(
      new BadRequestException('Envie uma imagem no formato JPG ou PNG'),
      false,
    );
    return;
  }

  callback(null, true);
};

export const imageUploadInterceptorOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
};

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Env } from 'src/config/env.schema';

export type UploadedImage = {
  url: string;
  key: string;
};

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(config: ConfigService<Env, true>) {
    this.region = config.get('AWS_DEFAULT_REGION', { infer: true });
    this.bucket = config.get('BUCKET_NAME', { infer: true });
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', { infer: true }),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', { infer: true }),
      },
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadedImage> {
    const extension = EXTENSION_BY_MIME_TYPE[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        'Formato de imagem não suportado. Envie um arquivo JPG ou PNG.',
      );
    }

    const key = `${folder}/${randomUUID()}.${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { url: this.buildPublicUrl(key), key };
  }

  async deleteImage(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao remover imagem do S3: key=${key} ${String(error)}`,
      );
    }
  }

  private buildPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from 'src/modules/storage/storage.service';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual =
    jest.requireActual<typeof import('@aws-sdk/client-s3')>(
      '@aws-sdk/client-s3',
    );
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

jest.mock('node:crypto', () => ({
  randomUUID: () => 'fixed-uuid',
}));

describe('StorageService', () => {
  let service: StorageService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        AWS_DEFAULT_REGION: 'sa-east-1',
        BUCKET_NAME: 'circule-bucket',
        AWS_ACCESS_KEY_ID: 'key',
        AWS_SECRET_ACCESS_KEY: 'secret',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(StorageService);
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('deve enviar o buffer ao S3 e devolver a URL pública e a key geradas', async () => {
      sendMock.mockResolvedValue({});

      const result = await service.uploadImage(
        {
          buffer: Buffer.from('fake'),
          mimetype: 'image/jpeg',
        } as Express.Multer.File,
        'books',
      );

      expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result).toEqual({
        url: 'https://circule-bucket.s3.sa-east-1.amazonaws.com/books/fixed-uuid.jpg',
        key: 'books/fixed-uuid.jpg',
      });
    });

    it('deve gerar extensão png para mimetype image/png', async () => {
      sendMock.mockResolvedValue({});

      const result = await service.uploadImage(
        {
          buffer: Buffer.from('fake'),
          mimetype: 'image/png',
        } as Express.Multer.File,
        'books',
      );

      expect(result.key).toBe('books/fixed-uuid.png');
    });

    it('deve lançar BadRequestException para mimetype não suportado', async () => {
      await expect(
        service.uploadImage(
          {
            buffer: Buffer.from('fake'),
            mimetype: 'application/pdf',
          } as Express.Multer.File,
          'books',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('deleteImage', () => {
    it('deve remover o objeto do S3 pela key', async () => {
      sendMock.mockResolvedValue({});

      await service.deleteImage('books/fixed-uuid.jpg');

      expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('não deve lançar quando a remoção falhar', async () => {
      sendMock.mockRejectedValue(new Error('falha de rede'));

      await expect(
        service.deleteImage('books/fixed-uuid.jpg'),
      ).resolves.toBeUndefined();
    });
  });
});

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';

function isMongoDuplicateKey(exception: unknown): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    'code' in exception &&
    exception.code === 11000
  );
}

@Catch()
export class MongoExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(exception: unknown, host: ArgumentsHost): void {
    if (isMongoDuplicateKey(exception)) {
      const response = host.switchToHttp().getResponse<Response>();
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'Já existe um registro com este valor único',
      });
      return;
    }

    super.catch(exception, host);
  }
}

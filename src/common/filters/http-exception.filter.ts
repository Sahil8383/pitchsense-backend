import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let code: string;
    let message: string;
    let details: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        const msg = (res as { message?: string | string[] }).message;
        if (Array.isArray(msg)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = { constraints: msg };
        } else {
          message = typeof msg === 'string' ? msg : exception.message;
          code =
            status === HttpStatus.NOT_FOUND ? 'NOT_FOUND' : 'VALIDATION_ERROR';
        }
      } else {
        message = exception.message;
        code =
          status === HttpStatus.NOT_FOUND ? 'NOT_FOUND' : 'VALIDATION_ERROR';
      }
      if (status === HttpStatus.BAD_REQUEST && code !== 'VALIDATION_ERROR') {
        code = 'BAD_REQUEST';
      }
      if (status === HttpStatus.CONFLICT) {
        code = 'CONFLICT';
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
      this.logger.error(exception);
    }

    response.status(status).json({
      error: { code, message, details },
    } satisfies ErrorResponse);
  }
}

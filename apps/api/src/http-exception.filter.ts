import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const STATUS_CODES: Readonly<Record<number, string>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  500: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
          ? Array.isArray(exceptionResponse.message)
            ? exceptionResponse.message.join(', ')
            : String(exceptionResponse.message)
          : exception.message;
      code =
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'code' in exceptionResponse
          ? String(exceptionResponse.code)
          : (STATUS_CODES[status] ?? 'HTTP_ERROR');
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception
    ) {
      const prismaError = exception as {
        code: string;
        meta?: { target?: readonly string[] | string };
      };
      if (prismaError.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'CONFLICT';
        const target = prismaError.meta?.target;
        const targetStr = Array.isArray(target)
          ? target.join(', ')
          : String(target ?? '');
        message = targetStr.includes('name')
          ? 'An item with this name already exists in this project.'
          : 'A record with these unique attributes already exists.';
      } else if (prismaError.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'The requested resource was not found.';
      } else if (prismaError.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        code = 'BAD_REQUEST';
        message = 'Invalid reference: related entity does not exist.';
      } else if (exception instanceof Error) {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const requestId = request.header('x-request-id') ?? randomUUID();
    const runId =
      typeof request.params.runId === 'string' ? request.params.runId : null;

    if (status >= 500) {
      this.logger.error({
        code,
        message,
        method: request.method,
        path: request.url,
        requestId,
        runId,
      });
    }
    response.setHeader('x-request-id', requestId);
    response.status(status).json({ data: null, error: { code, message } });
  }
}

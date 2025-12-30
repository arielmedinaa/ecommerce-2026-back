import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let stack: string | undefined;
    let path: string | undefined;
    let timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      message = typeof response === 'string' ? response : (response as any).message || message;
      error = (response as any).error || HttpStatus[status];
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
      
      if (stack) {
        const stackLines = stack.split('\n');
        if (stackLines.length > 1) {
          const match = stackLines[1].match(/\s+at\s+(.+):(\d+):(\d+)/);
          if (match) {
            path = `${match[1]}:${match[2]}`;
          }
        }
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp,
      path: request.url,
      message,
      error,
      ...(process.env.NODE_ENV !== 'production' && {
        stack,
        ...(path && { location: path })
      })
    };

    this.logger.error(
      `Error: ${message} \n` +
        `Path: ${request.url} \n` +
        `Status: ${status} \n` +
        `Stack: ${stack || 'No stack trace available'}`,
    );

    response.status(status).json(errorResponse);
  }
}

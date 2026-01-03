import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseHttpException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    cause?: Error, 
    public readonly context?: string,
  ) {
    const responseBody = {
      statusCode,
      message,
      error: HttpStatus[statusCode],
      ...(context && { context }),
      ...(cause && { cause: cause.message }),
    };

    super(responseBody, statusCode, { cause: cause });
    
    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
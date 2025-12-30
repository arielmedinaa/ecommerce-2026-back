import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseHttpException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly cause?: Error,
    public readonly context?: string,
  ) {
    const response = {
      statusCode,
      message,
      error: HttpStatus[statusCode],
      ...(context && { context }),
      ...(cause && { cause: cause.message }),
    };
    
    super(response, statusCode, { cause });
    this.name = this.constructor.name;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

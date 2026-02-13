import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseHttpException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    cause?: Error, 
    public readonly context?: string,
    public readonly service?: string,
    public readonly operation?: string,
    public readonly field?: string,
    public readonly line?: number
  ) {
    const responseBody = {
      statusCode,
      message,
      error: HttpStatus[statusCode],
      ...(context && { context }),
      ...(service && { service }),
      ...(operation && { operation }),
      ...(field && { field }),
      ...(line && { line }),
      ...(cause && { cause: cause.message }),
      timestamp: new Date().toISOString(),
      path: BaseHttpException.getCurrentPath()
    };

    BaseHttpException.logErrorDetails(responseBody, cause);

    super(responseBody, statusCode, { cause: cause });
    
    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private static logErrorDetails(errorResponse: any, cause?: Error): void {
    const logData = {
      timestamp: errorResponse.timestamp,
      level: 'ERROR',
      service: errorResponse.service || 'Unknown',
      operation: errorResponse.operation || 'Unknown',
      context: errorResponse.context || 'Unknown',
      statusCode: errorResponse.statusCode,
      error: errorResponse.error,
      message: errorResponse.message,
      field: errorResponse.field,
      line: errorResponse.line,
      path: errorResponse.path,
      ...(cause && {
        originalError: {
          name: cause.name,
          message: cause.message,
          stack: cause.stack
        }
      })
    };

    console.error('\n' + '='.repeat(80));
    console.error('SNEAKY THROWS ERROR DETECTED');
    console.error('='.repeat(80));
    console.error(`Timestamp: ${logData.timestamp}`);
    console.error(`Service: ${logData.service}`);
    console.error(`Operation: ${logData.operation}`);
    console.error(`Context: ${logData.context}`);
    console.error(`Status Code: ${logData.statusCode} ${logData.error}`);
    console.error(`Message: ${logData.message}`);
    
    if (logData.field) {
      console.error(`Field: ${logData.field}`);
    }
    
    if (logData.line) {
      console.error(`Line: ${logData.line}`);
    }
    
    if (logData.path) {
      console.error(`Path: ${logData.path}`);
    }

    if (logData.originalError) {
      console.error('\n🔍 Original Error Details:');
      console.error(`   Name: ${logData.originalError.name}`);
      console.error(`   Message: ${logData.originalError.message}`);
      console.error(`   Stack Trace:\n${logData.originalError.stack}`);
    }

    console.error('='.repeat(80));
    console.error('END SNEAKY THROWS ERROR\n');
  }

  private static getCurrentPath(): string {
    try {
      const stack = new Error().stack;
      const lines = stack?.split('\n');
      const callerLine = lines?.find(line => 
        !line.includes('base-http-exception.ts') && 
        !line.includes('Error.captureStackTrace')
      );
      return callerLine?.trim() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  static notFound(resource: string, identifier?: any, service?: string, line?: number): never {
    const message = identifier 
      ? `${resource} con identificador ${identifier} no encontrado`
      : `${resource} no encontrado`;
    throw new BaseHttpException(message, HttpStatus.NOT_FOUND, undefined, 'NotFound', service, undefined, undefined, line);
  }

  static badRequest(message: string, field?: string, service?: string, line?: number): never {
    throw new BaseHttpException(message, HttpStatus.BAD_REQUEST, undefined, 'BadRequest', service, undefined, field, line);
  }

  static unauthorized(message?: string, service?: string, line?: number): never {
    throw new BaseHttpException(
      message || 'No autorizado', 
      HttpStatus.UNAUTHORIZED, 
      undefined, 
      'Unauthorized', 
      service, 
      undefined, 
      undefined, 
      line
    );
  }

  static forbidden(message?: string, service?: string, line?: number): never {
    throw new BaseHttpException(
      message || 'Acceso prohibido', 
      HttpStatus.FORBIDDEN, 
      undefined, 
      'Forbidden', 
      service, 
      undefined, 
      undefined, 
      line
    );
  }

  static conflict(message: string, service?: string, line?: number): never {
    throw new BaseHttpException(message, HttpStatus.CONFLICT, undefined, 'Conflict', service, undefined, undefined, line);
  }

  static internalServerError(message: string, service?: string, operation?: string, cause?: Error, line?: number): never {
    throw new BaseHttpException(
      `Error interno del servidor: ${message}`, 
      HttpStatus.INTERNAL_SERVER_ERROR, 
      cause, 
      'InternalServerError', 
      service, 
      operation, 
      undefined, 
      line
    );
  }

  static serviceUnavailable(serviceName: string, operation?: string, cause?: Error, line?: number): never {
    const message = operation 
      ? `Servicio ${serviceName} no disponible para la operación ${operation}`
      : `Servicio ${serviceName} no disponible`;
    throw new BaseHttpException(message, HttpStatus.SERVICE_UNAVAILABLE, cause, 'ServiceUnavailable', serviceName, operation, undefined, line);
  }

  static timeout(operation: string, timeout?: number, service?: string, cause?: Error, line?: number): never {
    const message = timeout 
      ? `Timeout en la operación ${operation} después de ${timeout}ms`
      : `Timeout en la operación ${operation}`;
    throw new BaseHttpException(message, HttpStatus.REQUEST_TIMEOUT, cause, 'Timeout', service, operation, undefined, line);
  }

  static validation(message: string, field?: string, service?: string, line?: number): never {
    throw new BaseHttpException(message, HttpStatus.BAD_REQUEST, undefined, 'Validation', service, undefined, field, line);
  }

  static invalidFormat(field: string, expected: string, actual: any, service?: string, line?: number): never {
    const message = `Formato inválido para el campo "${field}". Se esperaba: ${expected}, recibido: ${actual}`;
    throw new BaseHttpException(message, HttpStatus.BAD_REQUEST, undefined, 'InvalidFormat', service, undefined, field, line);
  }

  static missingRequired(field: string, service?: string, line?: number): never {
    const message = `El campo "${field}" es requerido`;
    throw new BaseHttpException(message, HttpStatus.BAD_REQUEST, undefined, 'MissingRequired', service, undefined, field, line);
  }

  static duplicateKey(field: string, value: any, service?: string, line?: number): never {
    const message = `Registro duplicado. El campo "${field}" con valor "${value}" ya existe`;
    throw new BaseHttpException(message, HttpStatus.CONFLICT, undefined, 'DuplicateKey', service, undefined, field, line);
  }

  static databaseError(operation: string, cause?: Error, service?: string, line?: number): never {
    const message = `Error en la base de datos durante la operación: ${operation}`;
    throw new BaseHttpException(message, HttpStatus.INTERNAL_SERVER_ERROR, cause, 'DatabaseError', service, operation, undefined, line);
  }

  static microserviceError(serviceName: string, operation: string, cause?: Error, line?: number): never {
    const message = `Error en el microservicio ${serviceName} durante la operación: ${operation}`;
    throw new BaseHttpException(message, HttpStatus.BAD_GATEWAY, cause, 'MicroserviceError', serviceName, operation, undefined, line);
  }

  static invalidRange(field: string, min: number, max: number, actual: number, service?: string, line?: number): never {
    const message = `Valor fuera de rango para "${field}". Debe estar entre ${min} y ${max}, recibido: ${actual}`;
    throw new BaseHttpException(message, HttpStatus.BAD_REQUEST, undefined, 'InvalidRange', service, undefined, field, line);
  }

  static insufficientStock(productName: string, requested: number, available: number, service?: string, line?: number): never {
    const message = `Stock insuficiente para "${productName}". Solicitado: ${requested}, Disponible: ${available}`;
    throw new BaseHttpException(message, HttpStatus.BAD_REQUEST, undefined, 'InsufficientStock', service, undefined, undefined, line);
  }

  static handle(error: any, service?: string, operation?: string, line?: number): never {
    if (error instanceof BaseHttpException) {
      throw error;
    }

    // Extraer mensaje de múltiples fuentes
    const errorMessage = error.message || '';
    const microserviceError = error.response?.data || error;
    const microserviceMessage = microserviceError?.message || '';
    const microserviceErrorType = microserviceError?.error || '';
    const causeMessage = error.cause?.message || '';
    const responseMessage = error.response?.data?.message || '';
    const innerMessage = error.innerError?.message || '';
    const detailMessage = error.details?.message || '';
    
    const fullErrorText = `${errorMessage} ${causeMessage} ${responseMessage} ${innerMessage} ${detailMessage} ${microserviceMessage}`.trim();

    console.error('\n' + '='.repeat(80));
    console.error('SNEAKY THROWS - HANDLING ERROR');
    console.error('='.repeat(80));
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Service: ${service || 'Unknown'}`);
    console.error(`Operation: ${operation || 'Unknown'}`);
    console.error(`Line: ${line || 'Unknown'}`);
    console.error(`Original Error: ${error.name || 'Unknown'}`);
    console.error(`Message: ${errorMessage}`);
    console.error(`Microservice Error Type: ${microserviceErrorType}`);
    console.error(`Microservice Message: ${microserviceMessage}`);
    console.error(`Code: ${error.code || 'No code'}`);
    console.error(`Full Error Text: ${fullErrorText}`);
    console.error('='.repeat(80));
    console.error('END ERROR HANDLING\n');

    // Detectar errores específicos de microservicios
    if (microserviceErrorType === 'BadRequestException' ||
        microserviceError?.statusCode === 400 ||
        fullErrorText.includes('Ya existe una landing') ||
        fullErrorText.includes('Por favor, usa un título diferente') ||
        fullErrorText.includes('Registro duplicado') ||
        fullErrorText.includes('BadRequestException') ||
        error.name === 'BadRequestException' || 
        error.constructor?.name === 'BadRequestException' ||
        error.status === 400) {
      
      // Extraer el mensaje real del error original
      let realMessage = microserviceMessage || errorMessage;
      
      // Si el error tiene una respuesta con mensaje, usar ese
      if (responseMessage) {
        realMessage = responseMessage;
      } else if (causeMessage) {
        realMessage = causeMessage;
      } else if (innerMessage) {
        realMessage = innerMessage;
      } else if (detailMessage) {
        realMessage = detailMessage;
      }
      
      // Si el mensaje contiene "Internal server error", buscar el mensaje real en el error original
      if (realMessage === 'Internal server error' && errorMessage) {
        const originalErrorMatch = errorMessage.match(/BadRequestException: (.+)$/);
        if (originalErrorMatch) {
          realMessage = originalErrorMatch[1];
        }
      }
      
      throw BaseHttpException.badRequest(realMessage, undefined, service, line);
    }

    if (error.name === 'UnauthorizedException' || 
        error.constructor?.name === 'UnauthorizedException' ||
        error.status === 401) {
      throw BaseHttpException.unauthorized(errorMessage, service, line);
    }

    if (error.name === 'ForbiddenException' || 
        error.constructor?.name === 'ForbiddenException' ||
        error.status === 403) {
      throw BaseHttpException.forbidden(errorMessage, service, line);
    }

    if (error.name === 'NotFoundException' || 
        error.constructor?.name === 'NotFoundException' ||
        error.status === 404) {
      throw BaseHttpException.notFound('Resource', errorMessage, service, line);
    }

    // Errores de MongoDB
    if (error.code === 11000 || error.code === 'E11000' || fullErrorText.includes('duplicate key')) {
      let field = 'unknown';
      let value = 'unknown';
      
      if (error.keyPattern) {
        field = Object.keys(error.keyPattern)[0];
        value = error.keyValue[field];
      } else if (error.key) {
        field = error.key;
        value = error.errmsg?.match(/"([^"]+)"/)?.[1] || 'unknown';
      } else if (fullErrorText.includes('dup key')) {
        const match = fullErrorText.match(/dup key:\s*\{\s*([^:]+):\s*"([^"]+)"/);
        if (match) {
          field = match[1];
          value = match[2];
        }
      }
      
      throw BaseHttpException.duplicateKey(field, value, service, line);
    }

    // Errores de conexión
    if (error.code === 'ECONNREFUSED') {
      throw BaseHttpException.serviceUnavailable(service || 'Unknown', operation, error, line);
    }

    if (error.code === 'ETIMEDOUT' || fullErrorText.includes('timeout')) {
      throw BaseHttpException.timeout(operation || 'Unknown', undefined, service, error, line);
    }

    // Errores de validación de Mongoose
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      throw BaseHttpException.validation(errorMessage, undefined, service, line);
    }

    // Error genérico de microservicio
    if (errorMessage === 'Internal server error' || errorMessage?.includes('Internal server error')) {
      throw BaseHttpException.microserviceError(
        service || 'Unknown', 
        operation || 'Unknown', 
        error, 
        line
      );
    }

    // Error por defecto
    throw BaseHttpException.internalServerError(
      errorMessage || 'Error desconocido',
      service,
      operation,
      error,
      line
    );
  }
}

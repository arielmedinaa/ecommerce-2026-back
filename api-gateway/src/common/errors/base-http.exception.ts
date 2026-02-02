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

    super(responseBody, statusCode, { cause: cause });
    
    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private static getCurrentPath(): string {
    try {
      const stack = new Error().stack;
      const lines = stack?.split('\n');
      // Buscar la línea que no sea de este archivo
      const callerLine = lines?.find(line => 
        !line.includes('base-http.exception.ts') && 
        !line.includes('Error.captureStackTrace')
      );
      return callerLine?.trim() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Métodos estáticos para lanzar errores específicos (SneakyThrows style)
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

  // Método helper para manejar errores genéricos
  static handle(error: any, service?: string, operation?: string, line?: number): never {
    if (error instanceof BaseHttpException) {
      throw error;
    }

    // Manejar errores comunes de Node.js/NestJS
    if (error.code === 'ECONNREFUSED') {
      throw BaseHttpException.serviceUnavailable(service || 'Unknown', operation, error, line);
    }

    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      throw BaseHttpException.timeout(operation || 'Unknown', undefined, service, error, line);
    }

    if (error.name === 'CastError') {
      throw BaseHttpException.invalidFormat(error.path, 'valid type', error.value, service, line);
    }

    if (error.name === 'ValidationError') {
      throw BaseHttpException.validation(error.message, undefined, service, line);
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      throw BaseHttpException.duplicateKey(field, value, service, line);
    }

    // Error genérico
    throw BaseHttpException.internalServerError(
      error.message || 'Error desconocido',
      service,
      operation,
      error,
      line
    );
  }
}
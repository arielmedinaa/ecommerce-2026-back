import { BaseHttpException } from '../errors/base-http-exception';

export function SneakyThrows(serviceName?: string, operation?: string, lineNumber?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        if (error instanceof BaseHttpException) {
          throw error;
        }

        const line = lineNumber || SneakyThrows.detectLine(target, propertyName);
        const errorMessage = error.message || '';
        console.log('errorMessage', errorMessage);
        
        // Extraer información del error del microservicio
        const microserviceError = error.response?.data || error;
        const microserviceMessage = microserviceError?.message || '';
        const microserviceErrorType = microserviceError?.error || '';
        
        console.log('microserviceError', microserviceError);
        
        // Detectar BadRequestException del microservicio
        if (microserviceErrorType === 'BadRequestException' ||
            microserviceError?.statusCode === 400 ||
            errorMessage.includes('Ya existe una landing') ||
            errorMessage.includes('Por favor, usa un título diferente') ||
            errorMessage.includes('Registro duplicado') ||
            errorMessage.includes('BadRequestException') ||
            error.name === 'BadRequestException' || 
            error.constructor?.name === 'BadRequestException' ||
            error.status === 400) {
          
          // Usar el mensaje del microservicio si está disponible
          let realMessage = microserviceMessage || errorMessage;
          
          // Si el mensaje contiene "Internal server error", buscar el mensaje real en el error original
          if (realMessage === 'Internal server error' && errorMessage) {
            const originalErrorMatch = errorMessage.match(/BadRequestException: (.+)$/);
            if (originalErrorMatch) {
              realMessage = originalErrorMatch[1];
            }
          }
          
          throw BaseHttpException.badRequest(realMessage, undefined, serviceName, line);
        }

        BaseHttpException.handle(error, serviceName, operation, line);
      }
    };

    return descriptor;
  };
}

export function SneakyThrowsSync(serviceName?: string, operation?: string, lineNumber?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      try {
        return method.apply(this, args);
      } catch (error) {

        if (error instanceof BaseHttpException) {
          throw error;
        }

        const line = lineNumber || SneakyThrows.detectLine(target, propertyName);
        const errorMessage = error.message || '';
        
        // Extraer información del error del microservicio
        const microserviceError = error.response?.data || error;
        const microserviceMessage = microserviceError?.message || '';
        const microserviceErrorType = microserviceError?.error || '';
        
        // Detectar BadRequestException del microservicio
        if (microserviceErrorType === 'BadRequestException' ||
            microserviceError?.statusCode === 400 ||
            errorMessage.includes('Ya existe una landing') ||
            errorMessage.includes('Por favor, usa un título diferente') ||
            errorMessage.includes('Registro duplicado') ||
            errorMessage.includes('BadRequestException') ||
            error.name === 'BadRequestException' || 
            error.constructor?.name === 'BadRequestException' ||
            error.status === 400) {
          
          // Usar el mensaje del microservicio si está disponible
          let realMessage = microserviceMessage || errorMessage;
          
          // Si el mensaje contiene "Internal server error", buscar el mensaje real en el error original
          if (realMessage === 'Internal server error' && errorMessage) {
            const originalErrorMatch = errorMessage.match(/BadRequestException: (.+)$/);
            if (originalErrorMatch) {
              realMessage = originalErrorMatch[1];
            }
          }
          
          throw BaseHttpException.badRequest(realMessage, undefined, serviceName, line);
        }

        BaseHttpException.handle(error, serviceName, operation, line);
      }
    };

    return descriptor;
  };
}

export class SneakyThrowsHelper {
  static detectLine(target: any, propertyName: string): number {
    try {
      const stack = new Error().stack;
      const lines = stack?.split('\n');
      
      const methodLine = lines?.find((line, index) => {
        const nextLine = lines[index + 1];
        return nextLine?.includes(`${propertyName} (`) || 
               nextLine?.includes(`${propertyName}(`) ||
               nextLine?.includes(propertyName);
      });
      
      const lineMatch = methodLine?.match(/:(\d+):/);
      return lineMatch ? parseInt(lineMatch[1]) : 0;
    } catch {
      return 0;
    }
  }
}

SneakyThrows.detectLine = SneakyThrowsHelper.detectLine;

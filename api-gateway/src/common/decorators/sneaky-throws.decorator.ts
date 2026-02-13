import { BaseHttpException } from '../errors/base-http.exception';

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

        // Detectar si es un error de microservicio con mensaje específico
        if (error.message && 
            (error.message.includes('Ya existe una landing') ||
             error.message.includes('Por favor, usa un título diferente') ||
             error.message.includes('Registro duplicado') ||
             error.message.includes('BadRequestException'))) {
          // Extraer el mensaje real del error del microservicio
          const realMessage = error.response?.data?.message || 
                           error.cause?.message || 
                           error.message;
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

        // Detectar si es un error de microservicio con mensaje específico
        if (error.message && 
            (error.message.includes('Ya existe una landing') ||
             error.message.includes('Por favor, usa un título diferente') ||
             error.message.includes('Registro duplicado') ||
             error.message.includes('BadRequestException'))) {
          // Extraer el mensaje real del error del microservicio
          const realMessage = error.response?.data?.message || 
                           error.cause?.message || 
                           error.message;
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

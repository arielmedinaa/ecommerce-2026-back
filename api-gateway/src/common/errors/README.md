# Sistema de Manejo de Errores y SneakyThrows

Este directorio contiene un sistema centralizado de manejo de errores similar a SneakyThrows de Lombok en Java.

## 📁 Estructura

```
common/
├── errors/
│   └── base-http.exception.ts    # Manejador centralizado de errores
├── decorators/
│   ├── sneaky-throws.decorator.ts # Decorador @SneakyThrows
│   └── index.ts                  # Exportaciones
└── README.md                     # Este archivo
```

## 🚀 Uso del Decorador @SneakyThrows

El decorador `@SneakyThrows` automáticamente maneja cualquier error que ocurra en un método, usando el manejador centralizado `BaseHttpException.handle()`.

### Sintaxis

```typescript
@SneakyThrows(serviceName?: string, operation?: string, lineNumber?: number)
```

### Ejemplo de Uso

```typescript
import { SneakyThrows } from '../../../common/decorators';
import { BaseHttpException } from '../../../common/errors/base-http.exception';

@Controller('cart')
export class CartController {
  
  @Post()
  @SneakyThrows('CartService', 'addToCart')
  async addToCart(@Body() data: any) {
    // Validaciones que lanzan errores específicos
    if (!data.codigo) {
      BaseHttpException.missingRequired('codigo', 'CartService');
    }
    
    if (data.cantidad <= 0) {
      BaseHttpException.invalidRange('cantidad', 1, Number.MAX_SAFE_INTEGER, data.cantidad, 'CartService');
    }
    
    // Lógica del método
    const result = await this.service.process(data);
    return result;
    
    // Cualquier error no manejado será automáticamente procesado por @SneakyThrows
  }
}
```

## 🎯 Métodos Estáticos de BaseHttpException

### Errores de Cliente (4xx)

```typescript
// 400 Bad Request
BaseHttpException.badRequest(message: string, field?: string, service?: string, line?: number)

// 401 Unauthorized  
BaseHttpException.unauthorized(message?: string, service?: string, line?: number)

// 403 Forbidden
BaseHttpException.forbidden(message?: string, service?: string, line?: number)

// 404 Not Found
BaseHttpException.notFound(resource: string, identifier?: any, service?: string, line?: number)

// 409 Conflict
BaseHttpException.conflict(message: string, service?: string, line?: number)

// 422 Validation
BaseHttpException.validation(message: string, field?: string, service?: string, line?: number)
```

### Errores de Validación Específicos

```typescript
// Campo requerido faltante
BaseHttpException.missingRequired(field: string, service?: string, line?: number)

// Formato inválido
BaseHttpException.invalidFormat(field: string, expected: string, actual: any, service?: string, line?: number)

// Rango inválido
BaseHttpException.invalidRange(field: string, min: number, max: number, actual: number, service?: string, line?: number)

// Llave duplicada
BaseHttpException.duplicateKey(field: string, value: any, service?: string, line?: number)

// Stock insuficiente
BaseHttpException.insufficientStock(productName: string, requested: number, available: number, service?: string, line?: number)
```

### Errores de Servidor (5xx)

```typescript
// 500 Internal Server Error
BaseHttpException.internalServerError(message: string, service?: string, operation?: string, cause?: Error, line?: number)

// 502 Bad Gateway
BaseHttpException.microserviceError(serviceName: string, operation: string, cause?: Error, line?: number)

// 503 Service Unavailable
BaseHttpException.serviceUnavailable(serviceName: string, operation?: string, cause?: Error, line?: number)

// 504 Gateway Timeout
BaseHttpException.timeout(operation: string, timeout?: number, service?: string, cause?: Error, line?: number)

// Error de base de datos
BaseHttpException.databaseError(operation: string, cause?: Error, service?: string, line?: number)
```

## 🔄 Manejo Automático de Errores

El método `BaseHttpException.handle()` automáticamente detecta y convierte errores comunes:

```typescript
// Conexión rechazada -> ServiceUnavailable
ECONNREFUSED

// Timeout -> Timeout  
ETIMEDOUT o message.includes('timeout')

// Error de casteo de Mongoose -> InvalidFormat
CastError

// Error de validación de Mongoose -> Validation
ValidationError

// Llave duplicada de MongoDB -> DuplicateKey
code === 11000

// Cualquier otro error -> InternalServerError
```

## 📊 Respuesta de Error

Todas las respuestas de error incluyen:

```json
{
  "statusCode": 400,
  "message": "El campo 'codigo' es requerido",
  "error": "Bad Request",
  "context": "MissingRequired",
  "service": "CartService", 
  "operation": "addToCart",
  "field": "codigo",
  "line": 23,
  "cause": "Error original si existe",
  "timestamp": "2026-02-02T18:30:00.000Z",
  "path": "CartController.addToCart (/path/to/file.ts:23:15)"
}
```

## 🎨 Mejores Prácticas

### 1. Usar @SneakyThrows en todos los métodos de controladores

```typescript
@SneakyThrows('UserService', 'createUser')
async createUser(@Body() userData: CreateUserDto) {
  // Tu lógica aquí
}
```

### 2. Validaciones específicas con números de línea

```typescript
if (!userData.email) {
  BaseHttpException.missingRequired('email', 'UserService', 45);
}
```

### 3. Manejo de errores de microservicios

```typescript
try {
  const result = await this.microserviceClient.send(pattern, data).toPromise();
} catch (error) {
  BaseHttpException.handle(error, 'UserService', 'callExternalService', 67);
}
```

### 4. Errores de base de datos

```typescript
try {
  const user = await this.userModel.create(userData);
} catch (error) {
  BaseHttpException.databaseError('createUser', error, 'UserService', 72);
}
```

## 🔧 Versión Síncrona

Para métodos síncronos, usa `@SneakyThrowsSync`:

```typescript
@SneakyThrowsSync('ValidationService', 'validateData')
validateData(data: any) {
  if (!data.id) {
    BaseHttpException.missingRequired('id', 'ValidationService');
  }
  return true;
}
```

## 🎯 Beneficios

1. **Centralizado**: Todo el manejo de errores en un solo lugar
2. **Consistente**: Respuestas de error estandarizadas
3. **Detallado**: Información completa de contexto, línea, servicio, etc.
4. **Automático**: El decorador maneja errores no capturados
5. **TypeScript**: Totalmente tipado y seguro
6. **Java-like**: Sintaxis familiar para desarrolladores Java

## 🚨 Notas Importantes

- Siempre proporciona el nombre del servicio y la operación para mejor contexto
- Usa números de línea para depuración precisa
- El decorador automáticamente detecta `BaseHttpException` y las deja pasar
- Para errores asíncronos, usa `@SneakyThrows`
- Para errores síncronos, usa `@SneakyThrowsSync`

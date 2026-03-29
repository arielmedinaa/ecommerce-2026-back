# Guía de Pruebas: Motor de Eventos y Promociones

## 1. Crear Evento Simple (HotSale)

**Endpoint:** `POST /content/event`

**Payload:**

```json
{
  "nombre": "HotSale 2026",
  "descripcion": "Evento de descuentos especiales",
  "fechaInicio": "2026-05-01T00:00:00.000Z",
  "fechaFin": "2026-05-07T23:59:59.999Z",
  "activo": true,
  "limiteGlobalPorUsuario": 2,
  "prioridad": 10,
  "productos": [
    {
      "producto_codigo": "PROD-001",
      "limitePorUsuario": 1,
      "precioOferta": 99.99
    },
    {
      "producto_codigo": "PROD-002",
      "limitePorUsuario": 3
    }
  ]
}
```

## 2. Crear Evento con Jerarquía (Evento Padre e Hijo)

**Primero crear evento padre:**

```json
{
  "nombre": "Black Friday 2026",
  "descripcion": "Evento principal de Black Friday",
  "fechaInicio": "2026-11-20T00:00:00.000Z",
  "fechaFin": "2026-11-30T23:59:59.999Z",
  "activo": true,
  "limiteGlobalPorUsuario": 5,
  "prioridad": 20
}
```

**Luego crear evento hijo (Flash Sale de Tecnología):**

```json
{
  "nombre": "Flash Sale Tecnología",
  "descripcion": "Ofertas relámpago en tecnología",
  "fechaInicio": "2026-11-25T00:00:00.000Z",
  "fechaFin": "2026-11-27T23:59:59.999Z",
  "activo": true,
  "limiteGlobalPorUsuario": 2,
  "prioridad": 15,
  "idEventoPadre": 1,
  "productos": [
    {
      "producto_codigo": "TECH-001",
      "limitePorUsuario": 1,
      "precioOferta": 199.99
    }
  ]
}
```

## 3. Crear Evento con Condiciones Dinámicas

**Evento con condición de solo nuevos usuarios:**

```json
{
  "nombre": "Bienvenida Nuevos Usuarios",
  "descripcion": "Descuento exclusivo para nuevos clientes",
  "fechaInicio": "2026-04-01T00:00:00.000Z",
  "fechaFin": "2026-04-30T23:59:59.999Z",
  "activo": true,
  "limiteGlobalPorUsuario": 1,
  "prioridad": 5,
  "productos": [
    {
      "producto_codigo": "WELCOME-001",
      "precioOferta": 49.99
    }
  ]
}
```

**Luego agregar condición vía API:**

```json
// POST /content/event/condition
{
  "evento_id": 3,
  "tipo": "SOLO_NUEVOS_USUARIOS",
  "valor": "true",
  "activo": true
}
```

## 4. Crear Evento con Segmentación de Usuarios

**Evento exclusivo para usuarios VIP:**

```json
{
  "nombre": "VIP Exclusive Sale",
  "descripcion": "Ofertas exclusivas para miembros VIP",
  "fechaInicio": "2026-06-01T00:00:00.000Z",
  "fechaFin": "2026-06-07T23:59:59.999Z",
  "activo": true,
  "limiteGlobalPorUsuario": 3,
  "prioridad": 25,
  "beneficioUsuarioEspecifico": "VIP_GOLD",
  "productos": [
    {
      "producto_codigo": "VIP-001",
      "limitePorUsuario": 1,
      "precioOferta": 299.99
    }
  ]
}
```

## 5. Probar Validación de Producto en Carrito

**Endpoint:** `GET /content/event/validate?producto_codigo=PROD-001&cliente_id=user123`

**Respuesta esperada (cuando hay límite):**

```json
{
  "allowed": false,
  "reason": "Límite de compras alcanzado para este producto en el evento HotSale 2026."
}
```

**Respuesta esperada (cuando hay precioOferta):**

```json
{
  "allowed": true,
  "precioOferta": 99.99
}
```

## 6. Agregar Producto a Evento Existente

**Endpoint:** `POST /content/event/1/product`

**Payload:**

```json
{
  "producto_codigo": "PROD-003",
  "limitePorUsuario": 2,
  "precioOferta": 79.99
}
```

## 7. Listar Condiciones de un Evento

**Endpoint:** `GET /content/event/conditions?evento_id=1`

## 8. Obtener Jerarquía de Eventos

**Endpoint:** `GET /content/events/tree`

**Respuesta esperada:**

```json
[
  {
    "id": 1,
    "nombre": "Black Friday 2026",
    "subEventos": [
      {
        "id": 2,
        "nombre": "Flash Sale Tecnología",
        "eventoPadre": { "id": 1 }
      }
    ]
  }
]
```

## 9. Flujo Completo de Compra

1. **Crear evento** con límites y precios oferta
2. **Validar producto** antes de añadir al carrito
3. **Añadir producto al carrito** (el precio se actualizará automáticamente con precioOferta)
4. **Finalizar compra** (se crea orden automáticamente)
5. **Intentar volver a comprar** (debe fallar si se alcanzó el límite)

## 10. Configurar Condiciones Dinámicas

**Endpoint:** `POST /content/event/condition`

**Tipos disponibles:**

- `MIN_CARRITO`: Monto mínimo en carrito (requiere validación en cart service)
- `MAX_UNIDADES_PEDIDO`: Máximo unidades por pedido
- `SOLO_NUEVOS_USUARIOS`: Solo para usuarios sin compras previas
- `METODO_PAGO_ESPECIFICO`: Método de pago específico

## 11. Modificar Evento (Agregar Prioridad)

**Endpoint:** `PUT /content/event/:id` (TODO: implementar endpoint de actualización)

## 12. Obtener Eventos Activos

**Endpoint:** `GET /content/events/active`

## 13. Probar Segmentación de Usuarios

**Endpoint:** `GET /content/event/validate?producto_codigo=VIP-001&cliente_id=user123&usuario={"id":"user123","etiquetas":["VIP_GOLD"]}`

## 14. Eliminar Condición

**Endpoint:** `DELETE /content/event/condition/1`

## 15. Activar/Desactivar Condición

**Endpoint:** `PUT /content/event/condition/1/toggle`

---

## Notas para Pruebas

1. **Base de datos**: Asegurarse de que las tablas `eventos`, `eventos_productos`, `eventos_condiciones`, `ordenes`, `ordenes_items` existen.
2. **Microservicios**: Iniciar content, cart, auth (para segmentación), y API gateway.
3. **Authentication**: Para probar segmentación, el microservicio auth debe responder al comando `obtener_etiquetas_usuario`.
4. **Cart Service**: Debe enviar `usuario` en la validación para que se evalúen condiciones de segmentación.
5. **Órdenes**: Se crean automáticamente al finalizar compra; su estado debe ser 1 (pagado) para contar en límites.
6. **Agregar etiquetas a usuario**: Para probar segmentación, actualizar la tabla `usuarios` en la base de datos auth:
   ```sql
   UPDATE usuarios SET etiquetas = 'VIP_GOLD,PREMIUM' WHERE id = 1;
   ```
   O usar el microservicio auth para agregar etiquetas (falta implementar endpoint de actualización).

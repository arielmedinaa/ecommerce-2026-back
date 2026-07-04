# Estructura del envío a CentralApp (solicitudes de e-commerce)

Documenta el payload JSON que el microservicio **cart** envía a **CentralApp**
cuando se finaliza un pedido, cómo se arma y sus particularidades.

## Endpoint

- **Método:** `POST`
- **URL:** `https://${CENTRAL_APP_HOST}:3055/api/solicitud_ecommerce/insert_ecommerce_solicitudes`
- **Headers:** `Content-Type: application/json`, `Content-Length`
- **TLS:** `rejectUnauthorized: false` (se acepta el certificado del ERP interno).
- **Body:** el objeto solicitud (abajo), `JSON.stringify`.

Implementación del envío: [`microservices/cart/utils/cart-utils.ts`](../microservices/cart/utils/cart-utils.ts) → `UtilsCart.insertarCarritos()`.
Armado del payload: [`microservices/cart/service/cart.service.ts`](../microservices/cart/service/cart.service.ts) → `insertarSolicitudesCentralApp()` (~línea 1397+).
Plantilla base: [`microservices/cart/constants/cart.constants.ts`](../microservices/cart/constants/cart.constants.ts) → `NEW_SOLICITUD_INITIAL_STATE` / `DEFAULT_SOLICITUD`.

## Estructura del payload

```jsonc
{
  "codigo": 12345,                     // Código del carrito (mongo/cart id)
  "cliente": {
    "equipo": "string",                // Token/sesión del cliente
    "razonsocial": "string",           // Nombre / razón social
    "documento": "string",             // RUC o CI
    "correo": "string",
    "telefono": "string",
    "tipodocumento": "string",         // Opcional
    "id_usuario": 66                   // Id del usuario (del JWT)
  },
  "tiempo": "2026-07-02T10:15:00.000-03:00",  // ISO, zona America/Asuncion
  "envio": {
    "callePrincipal": "string",
    "calleSecundaria": "string",
    "numerocasa": "string",
    "ciudad": "string",
    "ciudadId": 1,                     // Código de ciudad (default 1)
    "barrio": "string",
    "observacion": "string",
    "ubicacion": { "lat": -25.31287, "lng": -57.578178 },
    "agendamiento": "2026-07-03T14",   // Fecha agendada (YYYY-MM-DDTHH) o ""
    "horaAgendamiento": "string",
    "retirar": 0                       // 0 = envío a domicilio, 1 = retiro en local
  },
  "pago": {
    "tipo": "string",                  // Ver "Tipos de pago" abajo
    "monto": "string",
    "moneda": "string",
    "condicion": "string",
    "periodicidad": "string",
    "entregainicial": 0,
    "cantidadcuotas": "string",
    "cuotas": []                       // Detalle de cuotas (crédito)
  },
  "articulos": {
    "contado": [ /* ItemContado */ ],
    "credito": [ /* ItemCredito */ ]
  },
  "estado": "1",                       // Ver "Estados" abajo
  "seguimiento": [],
  "transaccion": []
}
```

### ItemContado

```jsonc
{
  "codigo": "string",
  "nombre": "string",
  "ruta": "string",                    // URL/ruta del producto
  "imagen": "string",
  "cantidad": 1,
  "precio": 100000,
  "is_combo": 0,                       // 0 | 1
  "is_promo": 0,                       // 0 | 1
  "id_promo": null,                    // number | null (si is_promo=1)
  "nombrePromo": null                  // string | null
}
```

### ItemCredito

Igual que `ItemContado` pero con `cuota` y `precio` del plan de crédito:

```jsonc
{
  "codigo": "string",
  "nombre": "string",
  "ruta": "string",
  "imagen": "string",
  "cantidad": 1,
  "precio": 110000,                    // articulo.credito.precio ?? articulo.precio
  "cuota": 12,                         // Número de cuotas del plan
  "is_combo": 0,
  "is_promo": 0,
  "id_promo": null,
  "nombrePromo": null
}
```

## Particularidades importantes

1. **Una solicitud por modalidad / plan de cuotas.** No se envía un único objeto con
   todo mezclado:
   - Los artículos **contado** van en **una** solicitud (`articulos.contado` lleno,
     `articulos.credito` vacío).
   - Los artículos **crédito** se agrupan por **número de cuotas** (`cuota`) y se envía
     **una solicitud por cada valor de cuota** (`articulos.credito` lleno con ese grupo,
     `articulos.contado` vacío).
   - Ejemplo: un carrito con contado + crédito a 12 + crédito a 18 → **3** POST a CentralApp.

2. **Flags de combo/promo** (`is_combo`, `is_promo`, `id_promo`, `nombrePromo`) se derivan
   de `item.isCombo` / `item.isPromo` al armar cada ítem.

3. **Precio de crédito**: para ítems a crédito se usa `articulo.credito.precio` y, si no
   existe, `articulo.precio`.

4. **Sin reintentos.** `insertarCarritos` resuelve `1` si el HTTP status es 2xx y `0` en
   cualquier otro caso o error de red; el error se loguea pero la operación se marca como
   completada (no hay retry automático).

## Tipos de pago (`pago.tipo`)

Se setea en el checkout al construir el proceso (storefront `buildProcess`) según el método:
- `"Efectivo contra entrega"`
- `"Tarjeta contra entrega"`
- `"Bancard"`
- `"Pagopar"`
- `"Debito contra entrega"` (flujo de crédito)

## Estados (`estado`)

- `"1"`: carrito/solicitud activa.
- `"0"`: pedido finalizado (las órdenes finalizadas se guardan con `estado = 0`; ver
  `cart.service.ts`).

> Nota: los **datos laborales** del cliente (empresa, cargo, rubro, salario, etc.) no
> forman parte de este payload de CentralApp; se manejan en el ERP (`cliente.lab_*`) y en
> el perfil del usuario del e-commerce.

Especificación de Arquitectura: Motor de Eventos y Promociones
1. Contexto del Dominio
El sistema debe ser capaz de gestionar no solo descuentos, sino Eventos de Negocio (HotSale, Black Friday, Liquidación) que actúan como contenedores de lógica. Un evento se diferencia de una promoción simple por su capacidad de imponer restricciones de comportamiento (límites de compra, exclusividad, segmentación).

2. Jerarquía y Relaciones (Esquemas Sugeridos)
A. Evento (Entidad Principal)
Es el contenedor de alto nivel.

Campos Clave Existentes: limiteGlobalPorUsuario, beneficioUsuarioEspecifico, activo.

Recursividad: Debe soportar la relación idEventoPadre. Un evento "Padre" (ej. HotSale) puede tener eventos "Hijos" (ej. "Flash Sale de Tecnología") que heredan el marco temporal pero tienen reglas de productos específicas.

B. EventProduct (Pivote de Configuración)
No es solo una lista de productos, es donde se define la especificidad.

Regla de Prevalencia: El limitePorUsuario en esta tabla SIEMPRE sobrescribe al limiteGlobalPorUsuario de la entidad Event.

Campos requeridos: evento_id, producto_codigo, limitePorUsuario, precioOferta (opcional si el evento define el precio).

C. EventCondition (Nueva Entidad Sugerida)
Para evitar "hardcodear" eventos, se recomienda una tabla de condiciones dinámicas vinculadas al ID del evento:

Tipo de Condición: MIN_CARRITO, MAX_UNIDADES_PEDIDO, SOLO_NUEVOS_USUARIOS, METODO_PAGO_ESPECIFICO.

Valor: El parámetro de la condición.

3. Reglas de Negocio para el Service
1. Validación de Compra (Lógica de "Scan & Go" / Add to Cart)
Al intentar agregar un producto al carrito, el service debe:

Identificar todos los eventos activos donde el producto_codigo esté presente.

Si el producto pertenece a un evento "Hijo", validar primero las reglas del hijo.

Contador de Consumo: El service debe consultar el historial de órdenes (OrderItem) filtrando por:

cliente_documento (o token).

producto_codigo.

evento_id (del evento actual y, si tiene padre, validar si el límite es compartido).

Bloqueo: Si compras_realizadas >= limite_permitido, retornar allowed: false.

2. Jerarquía de Eventos (Nesting)
Herencia: Si un evento tiene un idEventoPadre, debe validar que las fechas del hijo estén dentro del rango del padre.

Conflictos: Si un producto está en dos eventos activos simultáneos, el sistema debe priorizar el evento con el menor precio o el evento marcado con mayor prioridad (añadir campo prioridad: number al schema).

3. Segmentación de Usuarios
El campo beneficioUsuarioEspecifico debe ser tratado como una regla de validación de identidad.

Si el campo contiene un valor (ej. "VIP_GOLD"), el service debe verificar que el perfil del usuario actual (extraído del token) cumpla con esa etiqueta antes de aplicar el precio del evento.

4. Ajustes Requeridos en el Schema Event
Para soportar la visión de "todas las posibilidades", el schema debe considerar:

Prioridad: @Column({ default: 0 }) prioridad: number; (Para decidir qué evento aplicar si hay solapamiento).

Relación Recursiva: ```typescript
@ManyToOne(() => Event, (event) => event.subEventos)
@JoinColumn({ name: 'idEventoPadre' })
eventoPadre: Event;

@OneToMany(() => Event, (event) => event.eventoPadre)
subEventos: Event[];


5. Matriz de Validación de los Services
Al ajustar los métodos del EventsService, asegurar que:

createEvent: Valide que fechaInicio < fechaFin.

validateProductAddToCart: No solo cuente órdenes con estado = 1 (pagado), sino también órdenes en proceso o "pendientes" para evitar el abuso del límite durante la ventana de pago.

findActiveEvents: Debe ser capaz de retornar el árbol jerárquico (Padre -> Hijos) para que el frontend pueda renderizar landings anidadas.

Nota para la IA: No intentes resolver cada tipo de evento (BlackFriday, HotSale) con un if/else. Utiliza las columnas de límites, fechas y relaciones parentales para crear un motor de reglas genérico donde el nombre del evento sea solo una etiqueta descriptiva.
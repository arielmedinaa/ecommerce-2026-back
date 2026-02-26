"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESTADO_SOLICITUD_MAP = exports.NEW_SOLICITUD_INITIAL_STATE = exports.NEW_CART_INITIAL_STATE = exports.DEFAULT_SOLICITUD = exports.DEFAULT_CART = void 0;
const moment_timezone_1 = require("moment-timezone");
exports.DEFAULT_CART = {
    proceso: '',
    cliente: {
        equipo: '',
        razonsocial: '',
        documento: '',
        correo: '',
        telefono: '',
    },
    tiempo: (0, moment_timezone_1.default)().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
    transaccion: [],
    seguimiento: [],
    envio: {
        callePrincipal: "",
        calleSecundaria: "",
        direccion: '',
        numerocasa: '',
        ciudad: '',
        ciudadId: 1,
        barrio: '',
        observacion: '',
        ubicacion: {},
        agendamiento: (0, moment_timezone_1.default)().tz('America/Asuncion').format('YYYY-MM-DDTHH'),
        horaAgendamiento: '',
        retirar: 0
    },
    pago: {
        tipo: '',
        monto: '',
        moneda: '',
        condicion: '',
        periodicidad: '',
        entregainicial: 0,
        cantidadcuotas: '',
        cuotas: [],
    },
    articulos: {
        contado: [],
        credito: [],
    },
    atencion: 0,
    estado: 1,
    estados: {
        articulos: {
            contado: { codigo: 0, descripcion: '', detalle: '' },
            credito: { codigo: 0, descripcion: '', detalle: '' },
        },
        progreso: { codigo: 0, descripcion: '' },
    },
};
exports.DEFAULT_SOLICITUD = {
    codigo: 1,
    cliente: {
        equipo: '',
        razonsocial: '',
        documento: '',
        correo: '',
        telefono: '',
        tipodocumento: ''
    },
    tiempo: (0, moment_timezone_1.default)().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
    envio: {
        callePrincipal: '',
        calleSecundaria: '',
        numerocasa: '',
        ciudad: '',
        ciudadId: 1,
        barrio: '',
        observacion: '',
        ubicacion: {
            lat: -25.31287,
            lng: -57.578178
        },
        agendamiento: '',
        horaAgendamiento: '',
        retirar: 0
    },
    pago: {
        tipo: '',
        monto: '',
        moneda: '',
        condicion: '',
        periodicidad: '',
        entregainicial: 0,
        cantidadcuotas: '',
        cuotas: []
    },
    articulos: {
        contado: [],
        credito: []
    },
    estado: 1,
    seguimiento: [],
    transaccion: []
};
const NEW_CART_INITIAL_STATE = (codigo, clienteToken, cuenta) => ({
    ...exports.DEFAULT_CART,
    codigo,
    cliente: {
        ...exports.DEFAULT_CART.cliente,
        equipo: clienteToken,
        correo: cuenta === 'undefined' ? '' : cuenta,
    },
});
exports.NEW_CART_INITIAL_STATE = NEW_CART_INITIAL_STATE;
const NEW_SOLICITUD_INITIAL_STATE = (codigo, clienteToken, cuenta) => ({
    ...exports.DEFAULT_SOLICITUD,
    codigo,
    cliente: {
        ...exports.DEFAULT_SOLICITUD.cliente,
        equipo: clienteToken,
        correo: cuenta === 'undefined' ? '' : cuenta,
    },
});
exports.NEW_SOLICITUD_INITIAL_STATE = NEW_SOLICITUD_INITIAL_STATE;
exports.ESTADO_SOLICITUD_MAP = {
    '01': 'Solicitud en análisis de crédito',
    '02': 'Solicitud en análisis de crédito',
    '04': 'Solicitud en análisis de crédito',
    '07': 'El pedido se está procesando',
    '10': 'El pedido se está procesando',
    '13': 'El pedido se está procesando',
    '22': 'El pedido se está procesando',
    '23': 'El pedido se está procesando',
    '05': 'El pedido se está procesando',
    '16': 'Su solicitud está lista para despacharse',
};
//# sourceMappingURL=cart.constants.js.map
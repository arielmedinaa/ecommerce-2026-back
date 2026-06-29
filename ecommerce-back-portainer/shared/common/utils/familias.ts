export const Familias = [
    "CELULARES Y SMARTWATCHES",
    "TELEVISORES Y AUDIO",
    "TECNOLOGÍA Y GAMING",
    "REFRIGERACIÓN",
    "CLIMATIZACIÓN",
    "COCINAS Y ANAFES",
    "LAVADO Y LIMPIEZA",
    "PEQUEÑOS ELECTRODOMESTICOS",
    "SALUD Y BELLEZA",
    "EQUIPOS DE GIMNASIA",
    "INDUMENTARIA DEPORTIVA",
    "INDUMENTARIA",
    "ACCESORIOS",
    "ADMINISTRATIVO",
    "VENTA CARTERA",
    "DESCUENTOS CONCEDIDOS",
    "SERVICIOS",
    "BEBÉS Y NIÑOS",
    "MUEBLES",
    "BAZAR",
    "JARDIN Y HERRAMIENTAS",
    "AUTOMOTOR",
    "PRODUCTOS INDUSTRIALES",
]

export type FamiliaConId = {
    id: number
    nombre: string
}

export const FamiliasConId: FamiliaConId[] = Familias.map((nombre, index) => ({
    id: index + 1,
    nombre,
}))

const SUBFAMILIA_NOMBRES = [
    "EN BLANCO",
    "DVD/BluRay",
    "TEATRO EN CASA",
    "PROYECTOR",
    "FILMADORAS",
    "CAMARA FOTOGRAFICA",
    "AMPLIFICADORES",
    "AURICULAR",
    "AUTORRADIO",
    "EQUIPOS DE SONIDO",
    "GRABADOR DE VOZ",
    "PARLANTES",
    "RADIO/MINICOMPONENTE",
    "HELADERAS",
    "FABRICADORA DE HIELO",
    "TERMO/CONSERVADORAS",
    "FREEZER/CONGELADOR",
    "ENFRIADORES",
    "COCINA",
    "EXTRACTOR DE AIRE",
    "BEBEDERO",
    "LAVAVAJILLAS",
    "HORNO ELECTRICO",
    "MICROONDAS",
    "PEQUEÑOS ELECTRODOMESTICOS",
    "AIRE ACONDICIONADO",
    "ESTUFA",
    "SECARROPAS",
    "LAVARROPAS",
    "TERMOCALEFON",
    "VENTILADORES",
    "MAQUINAS DE COSER",
    "BALANZA",
    "ASPIRADORAS",
    "PODADORAS",
    "ENCERADORA",
    "HIDROLAVADORAS",
    "ANDADOR",
    "BABY SEAT",
    "CARRITO",
    "CUNA",
    "CORRALITO",
    "CAMA/BASE/COLCHON",
    "MESA DE PLANCHAR",
    "CABECERA",
    "TOHALET",
    "MESITAS DE LUZ",
    "ROPEROS",
    "ARMARIOS",
    "COMODAS",
    "ESTANTES",
    "FRUTERAS",
    "JUEGO DE COMEDOR",
    "KIT DE COCINA",
    "MODULO P/ COCINA",
    "MULTIUSO",
    "JUEGO DE JARDIN",
    "JUEGO DE LIVING",
    "JUEGO DE SILLON",
    "MESITA CENTRO",
    "RACK",
    "SILLON",
    "SILLA",
    "MESA P/ COMPUTADORA",
    "ESCRITORIO",
    "MESAS",
    "TABLET",
    "CELULAR",
    "TELEFONO",
    "NOTEBOOK",
    "COMPUTADORAS",
    "MONITOR",
    "IMPRESORAS",
    "DISCO DURO",
    "GPS",
    "CONSOLAS Y JUEGOS",
    "AUTOS A PEDAL/TRICICLOS",
    "JUEGOS",
    "JUGUETES VARIOS",
    "PISCINAS",
    "BICICLETAS",
    "ELIPTICAS",
    "ESTATICAS",
    "SPINNING",
    "NEBULIZADOR",
    "TOMA DE PRESION",
    "CINTA PARA CAMINAR",
    "MULTIEJERCICIOS",
    "AFEITADORAS",
    "PLANCHITAS",
    "SECADORES DE PELO",
    "CHURRASQUERAS",
    "EXHIBIDOR DE ALIMENTOS",
    "EXHIBIDORAS",
    "FIAMBRERAS",
    "COMPRESOR DE AIRE",
    "SOLDADORES",
    "MOTOSIERRAS",
    "MOTOBOMBAS",
    "DESMALEZADORAS",
] as const

const SUBFAMILIA_FAMILIA_IDS = [
    8, 3, 2, 3, 3, 3, 3, 3, 3, 2, 3, 2, 2, 4, 4, 20, 4, 4, 6, 23, 4, 7, 6, 6, 8, 5, 5, 7,
    7, 5, 5, 8, 9, 7, 21, 7, 21, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19,
    19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 3, 1, 1, 3, 3, 3, 3, 3, 3, 3, 18,
    18, 18, 21, 18, 10, 10, 10, 9, 9, 10, 10, 9, 9, 9, 8, 23, 4, 19, 21, 21, 21, 21, 21,
] as const

export type SubFamiliaConIds = {
    id: number
    subfamiliaId: number
    familiaId: number
    nombre: string
}

if (SUBFAMILIA_NOMBRES.length !== SUBFAMILIA_FAMILIA_IDS.length) {
    throw new Error(
        `SubFamilias: cantidad de nombres (${SUBFAMILIA_NOMBRES.length}) != cantidad de familiaIds (${SUBFAMILIA_FAMILIA_IDS.length})`,
    )
}

export const SubFamilias: SubFamiliaConIds[] = SUBFAMILIA_NOMBRES.map((nombre, index) => {
    const subfamiliaId = index + 1
    const familiaId = SUBFAMILIA_FAMILIA_IDS[index]

    return {
        id: familiaId * 1000 + subfamiliaId,
        subfamiliaId,
        familiaId,
        nombre,
    }
})


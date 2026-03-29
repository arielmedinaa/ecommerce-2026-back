import { EventProduct } from './event-product.schema';
import { Vertical } from '@content/verticales/schemas/verticales.schemas';
import { Landing } from '@content/landings/schemas/landings.schemas';
import { EventCondition } from './event-condition.schema';
export declare class Event {
    id: number;
    nombre: string;
    descripcion?: string;
    fechaInicio: Date;
    fechaFin: Date;
    activo: boolean;
    limiteGlobalPorUsuario: number;
    beneficioUsuarioEspecifico?: string;
    prioridad: number;
    createdAt: Date;
    updatedAt: Date;
    eventProducts?: EventProduct[];
    conditions?: EventCondition[];
    idEventoPadre?: number;
    eventoPadre?: Event;
    subEventos?: Event[];
    idPromo?: number;
    idVerticales?: Vertical[];
    idLandings?: Landing[];
}

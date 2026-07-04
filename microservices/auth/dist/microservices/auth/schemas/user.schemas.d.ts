export declare class User {
    id: number;
    email: string;
    nombre: string;
    numeroCelular: string;
    numeroDocumento: string;
    avatar: string;
    proveedor: string;
    idProveedor: string;
    estaActivo: boolean;
    ultimoInicioSesion: Date;
    esInvitado: boolean;
    perfil: string;
    infoDispositivo?: any;
    direcciones?: any[];
    parentescos?: string;
    fechaExpiracion?: Date;
    etiquetas?: string[];
    fechaCreacion: Date;
    fechaActualizacion: Date;
    beneficioUsuario: string;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 500 })
  email: string;

  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true, default: '' })
  numeroCelular: string;

  @Column({ nullable: true, default: '', length: 20 })
  numeroDocumento: string;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  proveedor: string;

  @Column({ unique: true, length: 500 })
  idProveedor: string;

  @Column({ default: true })
  estaActivo: boolean;

  @Column({ type: 'datetime', nullable: true })
  ultimoInicioSesion: Date;

  @Column({ default: false })
  esInvitado: boolean;

  @Column({default: 'cliente'})
  perfil: string;

  @Column({ type: 'json', nullable: true })
  infoDispositivo?: any;

  // Direcciones de envío guardadas por el usuario (array). Cada item:
  // { id, etiqueta, callePrincipal, calleSecundaria, numerocasa, ciudad?, ciudadId?,
  //   barrio?, referencia?, ubicacion?: {lat,lng}, predeterminada? }
  // El shape es compatible con el `envio` del carrito para prefilear el checkout.
  @Column({ type: 'json', nullable: true })
  direcciones?: any[];

  // Referencias familiares (parentescos) del cliente para solicitudes a crédito.
  // JSON serializado: [{ nombre, parentesco, celular }] (hasta 3, sin duplicados).
  @Column({ type: 'longtext', nullable: true })
  parentescos?: string;

  // Datos laborales del cliente (para solicitudes a crédito). Se sincronizan
  // desde el ERP cuando existen y, si no, el cliente los completa una vez y
  // quedan guardados para no re-tipear el próximo checkout.
  // Shape: { empresa, cargo, rubro, fechaIngreso, salario?, ciudad, barrio,
  //          callePrincipal, calleSecundaria, numerocasa, contactoNombre, contactoTelefono }
  @Column({ type: 'json', nullable: true })
  datosLaborales?: any;

  @Column({ type: 'datetime', nullable: true })
  fechaExpiracion?: Date;

  @Column({ type: 'simple-array', nullable: true, default: 'NUEVO_USUARIO' })
  etiquetas?: string[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;

  @Column({ default: 'NUEVO_USUARIO' })
  beneficioUsuario: string;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('dashboard_widget')
export class DashboardWidget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: 'predefinido' | 'personalizado';

  @Column({ type: 'text' })
  config_json: string;

  @Column({ type: 'varchar', length: 10, default: '1' })
  tamano: '1' | '2' | '3' | 'full';

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  icono: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  color: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tbl_promociones')
export class Promo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  codigo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ nullable: true })
  estado: string;

  @Column({ nullable: true })
  codigo_promo: number;

  @Column({ nullable: true })
  nombre_promo: string;

  @Column({ nullable: true })
  fecha_inicio: Date;

  @Column({ nullable: true })
  fecha_fin: Date;

  @Column({ nullable: true })
  fecha_fin2: Date;

  @Column({ nullable: true })
  fecha_inicio2: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

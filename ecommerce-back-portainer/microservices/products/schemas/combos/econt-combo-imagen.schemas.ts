import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('econt_combo_imagenes')
export class EcontComboImagen {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  idCombo: number;

  @Column()
  imagen: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ length: 255, nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

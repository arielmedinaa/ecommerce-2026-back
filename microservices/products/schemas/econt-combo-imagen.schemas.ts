import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('econt_combo_imagenes')
export class EcontComboImagen {
  @PrimaryColumn()
  idCombo: number;

  @Column()
  imagen: string;

  @Column({ length: 255, nullable: true })
  updatedBy?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

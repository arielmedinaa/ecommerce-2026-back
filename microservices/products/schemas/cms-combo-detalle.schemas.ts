import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CmsCombo } from './cms-combo.schemas';

@Entity('cms_combo_detalles')
export class CmsComboDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codigoArticulo: string;

  @Column()
  nombreArticulo: string;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ nullable: true })
  comboId: number;

  @ManyToOne(() => CmsCombo, combo => combo.detalles, { nullable: true })
  @JoinColumn({ name: 'comboId' })
  combo: CmsCombo;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

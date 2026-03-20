import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('landings')
export class Landing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  title: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column('longtext')
  content: string;

  @Column({ length: 255 })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 255, nullable: true })
  metaTitle?: string;

  @Column({ type: 'text', nullable: true })
  metaDescription?: string;

  @Column('simple-array', { nullable: true })
  metaKeywords?: string[];

  @Column({ default: 0 })
  viewCount: number;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column('json', { nullable: true })
  customStyles?: Record<string, any>;

  @Column('json', { nullable: true })
  customScripts?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  publicadoEn?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiraEn?: Date;

  @Column({ length: 255, nullable: true })
  tituloRelacionado: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

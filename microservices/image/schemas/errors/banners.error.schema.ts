import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('logs_banners')
export class BannerError {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  bannerId: string;

  @Column()
  errorCode: string;

  @Column('text')
  message: string;

  @Column('json', { nullable: true })
  context: Record<string, any>;

  @Column('text', { nullable: true })
  stackTrace: string;

  @Column({ nullable: true })
  path: string;

  @Column({ nullable: true })
  operation: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  device: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
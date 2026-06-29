import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('llaves')
export class Llave {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  llave: string;

  @Column()
  valor: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

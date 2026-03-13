import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('guest_tokens')
export class GuestToken {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  token: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('proveedor_api_tokens')
export class ProveedorApiToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'token_hash' })
  token_hash: string;

  @Column({ name: 'revoked_at', nullable: true })
  revoked_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

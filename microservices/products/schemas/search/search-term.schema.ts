import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('search_terms')
export class SearchTerm {
  @PrimaryColumn({ type: 'varchar', length: 160 })
  termino: string; 

  @Column({ type: 'int', default: 0 })
  total: number; 

  @Column({ type: 'int', default: 0 })
  ultimo_resultados: number; 

  @Column({ type: 'datetime', nullable: true })
  ultima_vez: Date;
}

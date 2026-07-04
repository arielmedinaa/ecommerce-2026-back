import { Entity, PrimaryColumn, Column } from 'typeorm';

// Agregado de términos buscados (para "lo más buscado" y señal de demanda).
// Se actualiza por upsert en cada búsqueda finalizada. Lectura barata (top N).
@Entity('search_terms')
export class SearchTerm {
  @PrimaryColumn({ type: 'varchar', length: 160 })
  termino: string; // normalizado (lowercase/trim)

  @Column({ type: 'int', default: 0 })
  total: number; // veces buscado

  @Column({ type: 'int', default: 0 })
  ultimo_resultados: number; // nº de resultados de la última búsqueda (0 = demanda no cubierta)

  @Column({ type: 'datetime', nullable: true })
  ultima_vez: Date;
}

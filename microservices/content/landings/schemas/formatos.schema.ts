import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('formatos_landing')
export class Formato {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 255, unique: true })
    slug: string;

    @Column('text')
    description: string;

    @Column('longtext')
    template: string;

    @Column({ type: 'enum', enum: ['html', 'react', 'jsx'], default: 'html' })
    type: 'html' | 'react' | 'jsx';

    @Column({ length: 255 })
    category: string;

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column('text', { nullable: true })
    preview?: string;

    @Column('text', { nullable: true })
    config?: string;

    @Column('text', { nullable: true })
    variables?: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isPremium: boolean;

    @Column({ default: 0 })
    usageCount: number;

    @Column({ length: 255 })
    createdBy: string;

    @Column({ length: 255, nullable: true })
    updatedBy?: string;

    @Column({ default: 0 })
    sortOrder: number;

    @Column('text', { nullable: true })
    documentation?: string;

    @Column('text', { nullable: true })
    metadata?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
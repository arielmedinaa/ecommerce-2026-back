import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('logs_landings')
export class LandingError {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255, nullable: true })
    landingId?: string;

    @Column({ length: 255 })
    errorCode: string;

    @Column('text')
    message: string;

    @Column('json', { nullable: true })
    context: Record<string, any>;

    @Column('longtext', { nullable: true })
    stackTrace?: string;

    @Column({ length: 255, nullable: true })
    path?: string;

    @Column({ length: 255, nullable: true })
    userId?: string;

    @Column({ length: 255, nullable: true })
    operation?: string;

    @Column('json', { nullable: true })
    requestPayload?: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
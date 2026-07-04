import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserTrack, UserTrackTipo } from '../schemas/user-track.schema';
export interface TrackEventInput {
    userId: string;
    tipo: UserTrackTipo;
    metadata?: Record<string, any>;
}
export declare class UserTrackService implements OnModuleInit, OnModuleDestroy {
    private readonly repo;
    private readonly logger;
    private buffer;
    private flushTimer;
    private cleanupTimer;
    constructor(repo: Repository<UserTrack>);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    track(event: TrackEventInput | TrackEventInput[]): void;
    private flush;
    private cleanupOld;
    getUserTrack(userId: string): Promise<any>;
    private emptySummary;
}

import { OnModuleInit } from '@nestjs/common';
import { Connection } from 'typeorm';
export declare class MariaDbConnectionService implements OnModuleInit {
    private readonly connection;
    private readonly logger;
    constructor(connection: Connection);
    onModuleInit(): void;
}

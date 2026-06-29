import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class MariaDbConnectionService implements OnModuleInit {
  private readonly logger = new Logger(MariaDbConnectionService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    if (this.connection.isInitialized) {
      const { host, port, database } = this.connection.options as any;
      this.logger.log(
        `✅ Successfully connected to MariaDB database`,
      );
      this.logger.log(
        `   Host: ${host}:${port}`,
      );
      this.logger.log(
        `   Database: ${database}`,
      );
    } else {
      this.logger.error('❌ Failed to connect to MariaDB database');
    }
  }
}

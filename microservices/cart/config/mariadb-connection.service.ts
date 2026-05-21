import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class MariaDbConnectionService implements OnModuleInit {
  private readonly logger = new Logger(MariaDbConnectionService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      const { host, port, database } = this.dataSource.options as any;
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

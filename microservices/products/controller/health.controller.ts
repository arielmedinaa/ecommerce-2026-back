import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(
    @Inject(getDataSourceToken('READ_CONNECTION'))
    private readonly readDataSource: DataSource,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    if (!this.readDataSource.isInitialized) {
      throw new ServiceUnavailableException('DB read connection not initialized');
    }
    return { status: 'ok' };
  }
}

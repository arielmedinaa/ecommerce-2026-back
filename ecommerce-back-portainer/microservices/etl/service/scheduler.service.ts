import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EtlConfigStoreService } from './etl-config-store.service';
import { ProviderRunnerService } from './provider-runner.service';

// Corre solo, sin intervención humana, cada integración marcada `activo:
// true` (confirmado explícitamente por el usuario). Cada proveedor tiene su
// propio `cronExpression`, pero este tick central (cada 15 min) es el que
// decide si ya toca correrlo, comparando `ultimaCorrida` contra su propio
// intervalo — evita registrar un @Cron dinámico por proveedor.
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly configStore: EtlConfigStoreService,
    private readonly runner: ProviderRunnerService,
  ) {}

  @Cron('*/15 * * * *')
  async tick(): Promise<void> {
    const configs = this.configStore.listAll().filter((c) => c.activo);
    for (const config of configs) {
      try {
        this.logger.log(`Corriendo ETL activo de "${config.slug}" (proveedor #${config.idProveedor})`);
        const reporte = await this.runner.runOneLote(config.idProveedor, config.slug, 'etl-scheduler', config.cursor ?? null);
        config.cursor = reporte.nextCursor;
        config.ultimaCorrida = new Date().toISOString();
        config.ultimoResultado = {
          productosProcesados: reporte.productosProcesados,
          productosRechazados: reporte.productosRechazados,
          motivosRechazo: reporte.motivosRechazo,
        };
        this.configStore.save(config);
      } catch (error: any) {
        this.logger.error(`Falló la corrida programada de "${config.slug}": ${error.message}`);
        config.mensaje = `Error en la última corrida programada: ${error.message}`;
        config.actualizadoEn = new Date().toISOString();
        this.configStore.save(config);
      }
    }
  }
}

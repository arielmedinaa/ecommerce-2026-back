import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DashboardWidget } from '../../schemas/dashboard-widget.schema';
import { WidgetQueryService } from './widget-query.service';

export const ESTADISTICAS_PREDEFINIDAS = [
  { statKey: 'productos_stock', nombre: 'Stock de Productos' },
  { statKey: 'usuarios_clientes', nombre: 'Clientes Activos' },
  { statKey: 'usuarios_por_rol', nombre: 'Usuarios por Rol' },
  { statKey: 'carritos_activos', nombre: 'Carritos Activos' },
  { statKey: 'carritos_abandonados', nombre: 'Carritos Abandonados (mes)' },
  { statKey: 'productos_top_vendidos', nombre: 'Top Productos Vendidos (mes)' },
];

interface CrearWidgetInput {
  nombre: string;
  tipo: 'predefinido' | 'personalizado';
  config: any;
  tamano: '1' | '2' | '3' | 'full';
  icono?: string | null;
  color?: string | null;
}

@Injectable()
export class DashboardWidgetsService {
  constructor(
    @InjectRepository(DashboardWidget, 'WRITE_CONNECTION')
    private readonly widgetRepository: Repository<DashboardWidget>,
    private readonly widgetQueryService: WidgetQueryService,
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  private rangoMesActual() {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return {
      desde: inicioMes.toISOString().slice(0, 10),
      hasta: ahora.toISOString().slice(0, 10),
    };
  }

  private async resolverPredefinido(statKey: string): Promise<{ total: number; cantidad: number; filas: any[] }> {
    try {
      if (statKey === 'productos_stock') {
        const resultado = await firstValueFrom(this.productsClient.send({ cmd: 'get_products_stats' }, {}));
        const data = resultado?.data || {};
        return { total: Number(data.con_stock || 0), cantidad: Number(data.sin_stock || 0), filas: [] };
      }

      if (statKey === 'usuarios_clientes') {
        const resultado = await firstValueFrom(this.authClient.send({ cmd: 'get_clientes_stats' }, {}));
        const data = resultado?.data || {};
        return { total: Number(data.activos || 0), cantidad: Number(data.nuevos30d || 0), filas: [] };
      }

      if (statKey === 'usuarios_por_rol') {
        const resultado = await firstValueFrom(this.authClient.send({ cmd: 'get_usuarios_por_rol' }, {}));
        const data = resultado?.data || {};
        return { total: Number(data.total || 0), cantidad: Number(data.cantidad || 0), filas: data.filas || [] };
      }

      if (statKey === 'carritos_activos') {
        const resultado = await firstValueFrom(this.cartClient.send({ cmd: 'count_carritos_activos' }, {}));
        const data = resultado?.data || {};
        return { total: Number(data.total || 0), cantidad: 0, filas: [] };
      }

      if (statKey === 'carritos_abandonados') {
        const { desde, hasta } = this.rangoMesActual();
        const resultado = await firstValueFrom(this.cartClient.send({ cmd: 'count_carritos_abandonados' }, { desde, hasta }));
        const data = resultado?.data || {};
        return { total: Number(data.total || 0), cantidad: 0, filas: [] };
      }

      if (statKey === 'productos_top_vendidos') {
        const { desde, hasta } = this.rangoMesActual();
        const resultado = await firstValueFrom(this.cartClient.send({ cmd: 'get_top_productos_vendidos' }, { desde, hasta, limit: 10 }));
        const data = resultado?.data || {};
        return { total: Number(data.total || 0), cantidad: Number(data.cantidad || 0), filas: data.filas || [] };
      }

      return { total: 0, cantidad: 0, filas: [] as any[] };
    } catch (error) {
      return { total: 0, cantidad: 0, filas: [] as any[] };
    }
  }

  async listWidgets(): Promise<{ data: any[]; message: string; success: boolean }> {
    try {
      const widgets = await this.widgetRepository.find({ order: { orden: 'ASC', created_at: 'ASC' } });

      const widgetsConDatos = await Promise.all(
        widgets.map(async (widget) => {
          const config = JSON.parse(widget.config_json);
          let resultado: { total: number; cantidad: number; filas: any[] } = { total: 0, cantidad: 0, filas: [] };
          if (widget.tipo === 'personalizado') {
            const preview = await this.widgetQueryService.previewQuery(config);
            resultado = preview.data;
          } else {
            resultado = await this.resolverPredefinido(config.statKey);
          }
          return {
            id: widget.id,
            nombre: widget.nombre,
            tipo: widget.tipo,
            config,
            tamano: widget.tamano,
            orden: widget.orden,
            icono: widget.icono,
            color: widget.color,
            resultado,
          };
        }),
      );

      return { data: widgetsConDatos, message: 'Widgets obtenidos', success: true };
    } catch (error) {
      return { data: [], message: error?.message || 'Error al listar widgets', success: false };
    }
  }

  async createWidget(
    input: CrearWidgetInput,
  ): Promise<{ data: any; message: string; success: boolean }> {
    try {
      const ultimo = await this.widgetRepository.find({ order: { orden: 'DESC' }, take: 1 });
      const siguienteOrden = ultimo.length > 0 ? ultimo[0].orden + 1 : 0;

      const widget = this.widgetRepository.create({
        nombre: input.nombre,
        tipo: input.tipo,
        config_json: JSON.stringify(input.config),
        tamano: input.tamano,
        orden: siguienteOrden,
        icono: input.icono || null,
        color: input.color || null,
      });

      const guardado = await this.widgetRepository.save(widget);
      return { data: guardado, message: 'Widget creado correctamente', success: true };
    } catch (error) {
      return { data: null, message: error?.message || 'Error al crear widget', success: false };
    }
  }

  async updateWidget(
    id: number,
    input: CrearWidgetInput,
  ): Promise<{ data: any; message: string; success: boolean }> {
    try {
      const existente = await this.widgetRepository.findOne({ where: { id } });
      if (!existente) {
        return { data: null, message: 'El widget no existe.', success: false };
      }
      await this.widgetRepository.update(id, {
        nombre: input.nombre,
        tipo: input.tipo,
        config_json: JSON.stringify(input.config),
        tamano: input.tamano,
        icono: input.icono || null,
        color: input.color || null,
      });
      const actualizado = await this.widgetRepository.findOne({ where: { id } });
      return { data: actualizado, message: 'Widget actualizado correctamente', success: true };
    } catch (error) {
      return { data: null, message: error?.message || 'Error al actualizar widget', success: false };
    }
  }

  listEstadisticasPredefinidas(): { data: typeof ESTADISTICAS_PREDEFINIDAS; message: string; success: boolean } {
    return { data: ESTADISTICAS_PREDEFINIDAS, message: 'Estadísticas predefinidas obtenidas', success: true };
  }

  async deleteWidget(id: number): Promise<{ data: null; message: string; success: boolean }> {
    try {
      await this.widgetRepository.delete(id);
      return { data: null, message: 'Widget eliminado correctamente', success: true };
    } catch (error) {
      return { data: null, message: error?.message || 'Error al eliminar widget', success: false };
    }
  }
}

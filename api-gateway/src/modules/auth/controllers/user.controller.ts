import { Body, Controller, Get, Param, Post, Put, Delete, Query, Inject, Req, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';

@Controller('users')
export class UserController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
  ) {}

  @Get('me/recomendacion')
  async getRecomendacion(@Req() req: Request) {
    try {
      const userId = await this.resolverUserId(req);
      const cartsRes: any = await firstValueFrom(
        this.cartClient.send({ cmd: 'get_carts_by_user' }, { userId, estado: '0' }),
      );
      const carts: any[] = Array.isArray(cartsRes?.data) ? cartsRes.data.slice(0, 5) : [];
      // 2) Códigos de los artículos comprados.
      const codigos = new Set<string>();
      for (const c of carts) {
        const art = c?.articulos || {};
        for (const tipo of ['contado', 'credito']) {
          for (const it of Array.isArray(art?.[tipo]) ? art[tipo] : []) {
            const cod = String(it?.codigo ?? it?.codigo_articulo ?? '').trim();
            if (cod) codigos.add(cod);
          }
        }
      }
      if (codigos.size === 0) return { data: { familia: null, productos: [] }, success: true, message: 'SIN HISTORIAL' };

      // 3) Resolver familia de cada comprado y contar la más frecuente.
      const prodsRes: any = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_products_by_codigos' }, { codigos: [...codigos], limit: 200 }),
      );
      const comprados: any[] = Array.isArray(prodsRes?.data) ? prodsRes.data : [];
      const tally = new Map<string, number>();
      for (const p of comprados) {
        const fam = String(p?.familia ?? '').trim();
        if (fam) tally.set(fam, (tally.get(fam) || 0) + 1);
      }
      if (tally.size === 0) return { data: { familia: null, productos: [] }, success: true, message: 'SIN FAMILIA' };
      const topFamilia = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];

      // 4) Productos de esa familia (excluir los ya comprados).
      const recomRes: any = await firstValueFrom(
        this.productsClient.send(
          { cmd: 'get_products' },
          { categoria: topFamilia, limit: 12, offset: 0, soloConStock: true },
        ),
      );
      const rows: any[] = Array.isArray(recomRes?.data) ? recomRes.data : [];
      const productos = rows
        .filter((p) => !codigos.has(String(p?.codigo_articulo ?? '').trim()))
        .slice(0, 10)
        .map((p) => ({
          codigo: String(p?.codigo_articulo ?? ''),
          nombre: String(p?.nombre_articulo ?? p?.nombre ?? ''),
          precio: p?.precio ?? p?.precioventa ?? null,
          imagenes: Array.isArray(p?.imagenes) ? p.imagenes : [],
        }));
      return { data: { familia: topFamilia, productos }, success: true, message: 'RECOMENDACION' };
    } catch (e) {
      // Sin sesión / sin historial → vacío (el front no muestra la sección).
      return { data: { familia: null, productos: [] }, success: true, message: 'SIN RECOMENDACION' };
    }
  }

  // Resuelve el id del usuario autenticado a partir del JWT (cookie o Authorization),
  // reutilizando el mismo cmd que /auth/me. Lanza 401 si no hay token válido.
  private async resolverUserId(req: Request): Promise<number> {
    const token =
      (req as any).cookies?.access_token ||
      req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('NO AUTENTICADO');
    const perfil: any = await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_profile' }, { token }),
    );
    const id = Number(perfil?.user?.id);
    if (!Number.isFinite(id)) throw new UnauthorizedException('TOKEN INVÁLIDO');
    return id;
  }

  // Estado de un email: si existe (en otra cuenta) y si tuvo movimientos (carritos) en 30d.
  @Get('email-status')
  async emailStatus(@Query('email') email: string, @Query('excludeUserId') excludeUserId?: string) {
    const found: any = await firstValueFrom(
      this.authClient.send(
        { cmd: 'find_user_by_email' },
        { email, excludeUserId: excludeUserId ? Number(excludeUserId) : undefined },
      ),
    );
    if (!found?.exists) return { exists: false };
    const mov: any = await firstValueFrom(
      this.cartClient.send({ cmd: 'user_has_movements' }, { userId: found.userId }),
    );
    return { exists: true, userId: found.userId, nombre: found.nombre, hasMovements: !!mov?.hasMovements };
  }

  @Post('listar')
  async getAllUsers(@Body() filters: any) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'get_all_users' }, { filters })
      );
      return result;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw new Error('Error al obtener usuarios: ' + error.message);
    }
  }

  // Listado de clientes para el admin: paginado + búsqueda + filtros.
  @Get('clientes')
  async listClientes(@Query() query: any) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'list_clientes' }, query || {}),
    );
  }

  @Get('clientes/stats')
  async clientesStats() {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_clientes_stats' }, {}),
    );
  }

  // Todos los ids de clientes que cumplen los filtros (para "seleccionar todos").
  @Get('clientes/ids')
  async clientesIds(@Query() query: any) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'list_cliente_ids' }, query || {}),
    );
  }

  // Cupones del usuario, ENRIQUECIDOS con el detalle del master (content).
  // Backward-compatible: conserva idCupon/descripcion (los usa el admin) y agrega
  // codigo/tipoDescuento/porcentaje/valor/montoMinimo/vigente (los usa el storefront).
  @Get(':id/cupones')
  async userCoupons(@Param('id') id: string) {
    const uc: any = await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_coupons' }, { userId: Number(id) }),
    );
    const userCoupons: any[] = Array.isArray(uc?.data) ? uc.data : [];
    const ids = [...new Set(userCoupons.map((c) => Number(c.idCupon)).filter(Boolean))];
    let masterById = new Map<number, any>();
    if (ids.length > 0) {
      const det: any = await firstValueFrom(
        this.contentClient.send({ cmd: 'obtener_cupones_por_ids' }, { ids }),
      );
      for (const m of Array.isArray(det?.data) ? det.data : []) masterById.set(Number(m.id), m);
    }
    const data = userCoupons.map((c) => {
      const m = masterById.get(Number(c.idCupon));
      return {
        ...c,
        codigo: m?.codigo ?? null,
        tipoDescuento: m?.tipoDescuento ?? null,
        porcentajeDescuento: m?.porcentajeDescuento ?? null,
        valorDescuento: m?.valorDescuento ?? null,
        montoMinimoCompra: m?.montoMinimoCompra ?? null,
        vigente: m?.vigente ?? false,
      };
    });
    return { data, success: true, message: 'CUPONES DEL USUARIO' };
  }

  // Ingesta de tracking (público): fire-and-forget hacia el auth service vía NATS emit.
  // Acepta userId (o guestId) en el body; no espera respuesta ni bloquea al cliente.
  @Post('track')
  trackEvent(@Body() body: { userId?: string; guestId?: string; tipo: string; metadata?: any } | any) {
    try {
      const events = Array.isArray(body) ? body : [body];
      const normalized = events
        .map((e) => ({
          userId: String(e?.userId ?? e?.guestId ?? '').trim(),
          tipo: e?.tipo,
          metadata: e?.metadata ?? {},
        }))
        .filter((e) => e.userId && e.tipo);
      if (normalized.length > 0) {
        this.authClient.emit('track_user_event', normalized).subscribe({ error: () => undefined });
      }
    } catch {
      // fire-and-forget: nunca falla al cliente
    }
    return { success: true };
  }

  // Resumen de seguimiento (30 días) de un cliente para el admin.
  @Get(':id/tracking')
  async userTracking(@Param('id') id: string) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_track' }, { userId: String(id) }),
    );
  }

  @Post('mensaje-masivo')
  async mensajeMasivo(@Body() body: { userIds: (number | string)[]; mensaje: string; bannerUrl?: string }) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'send_mass_message' }, body),
    );
  }

  @Post('search')
  async searchUsers(@Body() data: { filters: any }) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'search_users' }, data)
      );
      return result;
    } catch (error) {
      console.error('Error in searchUsers:', error);
      throw new Error('Error al buscar usuarios: ' + error.message);
    }
  }

  // ----------------------------- Perfil (datos personales) del usuario autenticado -----------------------------
  @Get('me/perfil')
  async getMiPerfil(@Req() req: Request) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_profile_db' }, { userId }),
    );
  }

  // Autocompletado de cliente del ERP por documento/RUC (checkout). Público: se usa
  // antes de que el cliente nuevo tenga sesión completa.
  @Get('erp-cliente/:documento')
  async getClienteErp(@Param('documento') documento: string) {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_cliente_erp' }, { documento }),
    );
  }

  // Catálogos de Cargo y Rubro del ERP para los selects del checkout de crédito.
  @Get('erp-cargos-rubros')
  async getCargosRubros() {
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_cargos_rubros' }, {}),
    );
  }

  @Put('me/perfil')
  async updateMiPerfil(
    @Req() req: Request,
    @Body() patch: { nombre?: string; numeroCelular?: string; numeroDocumento?: string; email?: string; parentescos?: string },
  ) {
    const userId = await this.resolverUserId(req);
    const res: any = await firstValueFrom(
      this.authClient.send({ cmd: 'update_user_personal' }, { userId, patch }),
    );
    // Propaga los datos nuevos al objeto `cliente` de TODOS los carritos del usuario
    // (best-effort: si falla, el perfil igual quedó actualizado).
    if (res?.success) {
      try {
        await firstValueFrom(
          this.cartClient.send(
            { cmd: 'sync_cart_cliente' },
            {
              userId,
              cliente: {
                razonsocial: patch?.nombre,
                correo: patch?.email,
                telefono: patch?.numeroCelular,
                documento: patch?.numeroDocumento,
              },
            },
          ),
        );
      } catch (e) {
        console.error('sync_cart_cliente falló tras update_user_personal:', e);
      }
    }
    return res;
  }

  // ----------------------------- Direcciones del usuario autenticado -----------------------------
  // El userId SIEMPRE se resuelve del token (no se confía en un id del cliente).
  @Get('me/direcciones')
  async getMisDirecciones(@Req() req: Request) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'get_user_addresses' }, { userId }),
    );
  }

  @Post('me/direcciones')
  async addMiDireccion(@Req() req: Request, @Body() address: any) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'add_user_address' }, { userId, address }),
    );
  }

  @Put('me/direcciones/:addressId')
  async updateMiDireccion(@Req() req: Request, @Param('addressId') addressId: string, @Body() patch: any) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'update_user_address' }, { userId, addressId, patch }),
    );
  }

  @Delete('me/direcciones/:addressId')
  async deleteMiDireccion(@Req() req: Request, @Param('addressId') addressId: string) {
    const userId = await this.resolverUserId(req);
    return await firstValueFrom(
      this.authClient.send({ cmd: 'delete_user_address' }, { userId, addressId }),
    );
  }

  @Put()
  async updateUsers(@Body() data: { filters: any; updates: any }) {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'update_users' }, data)
      );
      return result;
    } catch (error) {
      console.error('Error in updateUsers:', error);
      throw new Error('Error al actualizar usuarios: ' + error.message);
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfertasValidationService } from './errors/ofertas.spec';
import { Oferta } from '../schemas/oferta.schemas';

@Injectable()
export class OfertasService {
  private readonly logger = new Logger(OfertasService.name);

  constructor(
    @InjectRepository(Oferta, 'WRITE_CONNECTION')
    private readonly ofertaWriteRepository: Repository<Oferta>,
    @InjectRepository(Oferta, 'READ_CONNECTION')
    private readonly ofertaReadRepository: Repository<Oferta>,
    private readonly ofertasValidationService: OfertasValidationService,
  ) { }

  async createOrUpdateOferta(
    createData: any,
    codigo?: number,
  ): Promise<{ data: any; message: string; success: boolean }> {
    const validation = await this.ofertasValidationService.validateOfertaPayload(
      createData,
      codigo,
    );

    if (!validation.isValid) {
      return validation.error;
    }

    try {
      const existingOferta = await this.ofertaReadRepository.findOne({
        where: { activo: true },
        relations: ['productos'],
      });

      if (existingOferta) {
        existingOferta.tiempoActivo = createData.tiempoActivo;
        existingOferta.activo =
          createData.activo !== undefined ? createData.activo : existingOferta.activo;
        existingOferta.productos = createData.productos;

        const updatedOferta = await this.ofertaWriteRepository.save(existingOferta);

        return {
          data: updatedOferta,
          message: 'OFERTA ACTUALIZADA EXITOSAMENTE',
          success: true,
        };
      } else {
        const newOferta = this.ofertaWriteRepository.create({
          ...createData,
          activo: createData.activo !== undefined ? createData.activo : true,
        });

        const savedOferta = await this.ofertaWriteRepository.save(newOferta);

        return {
          data: savedOferta,
          message: 'OFERTA CREADA EXITOSAMENTE',
          success: true,
        };
      }
    } catch (error) {
      this.logger.error('Error createOrUpdateOferta', error);
      return {
        data: [],
        message: `Error al crear/actualizar la oferta: ${error.message}`,
        success: false,
      };
    }
  }

  async getActiveOferta(): Promise<{
    data: any;
    message: string;
    success: boolean;
  }> {
    try {
      const oferta = await this.ofertaReadRepository.findOne({
        where: { activo: true },
        relations: ['productos'],
      });
      return {
        data: oferta,
        message: oferta ? 'Oferta activa encontrada' : 'No hay ofertas activas',
        success: true,
      };
    } catch (error) {
      return {
        data: [],
        message: `Error al obtener la oferta activa: ${error.message}`,
        success: false,
      };
    }
  }

  async getAllOfertas(): Promise<{
    data: any[];
    message: string;
    success: boolean;
  }> {
    try {
      const ofertas = await this.ofertaReadRepository.find({
        relations: ['productos'],
        order: { createdAt: 'DESC' },
      });

      return {
        data: ofertas,
        message: 'Ofertas obtenidas exitosamente',
        success: true,
      };
    } catch (error) {
      return {
        data: [],
        message: `Error al obtener las ofertas: ${error.message}`,
        success: false,
      };
    }
  }

  async deleteOferta(
    id: string | number,
  ): Promise<{ data: null; message: string; success: boolean }> {
    const idValidation = await this.ofertasValidationService.validateOfertaId(id);

    if (!idValidation.isValid) {
      return idValidation.error;
    }

    try {
      const oferta = await this.ofertaReadRepository.findOne({
        where: { id: Number(id) },
        relations: ['productos']
      });
      if (!oferta) {
        return {
          data: null,
          message: 'Oferta no encontrada',
          success: false,
        };
      }

      await this.ofertaWriteRepository.remove(oferta);

      return {
        data: null,
        message: 'Oferta eliminada exitosamente',
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        message: `Error al eliminar la oferta: ${error.message}`,
        success: false,
      };
    }
  }

  async toggleOfertaStatus(
    id: string | number,
  ): Promise<{ data: any; message: string; success: boolean }> {
    const idValidation = await this.ofertasValidationService.validateOfertaId(id);

    if (!idValidation.isValid) {
      return idValidation.error;
    }

    try {
      const oferta = await this.ofertaReadRepository.findOne({
        where: { id: Number(id) },
        relations: ['productos']
      });
      if (!oferta) {
        return {
          data: [],
          message: 'Oferta no encontrada',
          success: false,
        };
      }

      oferta.activo = !oferta.activo;
      const updatedOferta = await this.ofertaWriteRepository.save(oferta);

      return {
        data: updatedOferta,
        message: `Oferta ${updatedOferta?.activo ? 'activada' : 'desactivada'} exitosamente`,
        success: true,
      };
    } catch (error) {
      return {
        data: [],
        message: `Error al cambiar el estado de la oferta: ${error.message}`,
        success: false,
      };
    }
  }
}

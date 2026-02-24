import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OfertasValidationService } from './errors/ofertas.spec';

@Injectable()
export class OfertasService {
  constructor(
    @InjectModel('Oferta') private readonly ofertaModel: Model<any>,
    private readonly ofertasValidationService: OfertasValidationService,
  ) {}

  async createOrUpdateOferta(
    createData: any,
    codigo?: number,
  ): Promise<{ data: any; message: string; success: boolean }> {
    const validation =
      await this.ofertasValidationService.validateOfertaPayload(
        createData,
        codigo,
      );

    if (!validation.isValid) {
      return validation.error;
    }

    try {
      const existingOferta = await this.ofertaModel.findOne({ activo: true });
      if (existingOferta) {
        const updatedOferta = await this.ofertaModel.findByIdAndUpdate(
          existingOferta._id,
          {
            ...createData,
            updatedAt: new Date(),
          },
          { new: true },
        );

        return {
          data: updatedOferta,
          message: 'OFERTA ACTUALIZADO EXITOSAMENTE',
          success: true,
        };
      } else {
        const newOferta = await this.ofertaModel.create({
          ...createData,
          activo: createData.activo !== undefined ? createData.activo : true,
        });

        return {
          data: newOferta,
          message: 'OFERTA CREADO EXITOSAMENTE',
          success: true,
        };
      }
    } catch (error) {
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
      const oferta = await this.ofertaModel.findOne({ activo: true });

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
      const ofertas = await this.ofertaModel.find().sort({ createdAt: -1 });

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

  async updateOferta(
    id: string,
    updateData: any,
    codigo?: number,
  ): Promise<{ data: any; message: string; success: boolean }> {
    const idValidation =
      await this.ofertasValidationService.validateOfertaId(id);

    if (!idValidation.isValid) {
      return idValidation.error;
    }

    const validation =
      await this.ofertasValidationService.validateOfertaPayload(
        updateData,
        codigo,
      );

    if (!validation.isValid) {
      return validation.error;
    }

    try {
      const oferta = await this.ofertaModel.findById(id);
      if (!oferta) {
        return {
          data: [],
          message: 'Oferta no encontrada',
          success: false,
        };
      }

      const updatedOferta = await this.ofertaModel.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { new: true },
      );

      return {
        data: updatedOferta,
        message: 'Oferta actualizada exitosamente',
        success: true,
      };
    } catch (error) {
      return {
        data: [],
        message: `Error al actualizar la oferta: ${error.message}`,
        success: false,
      };
    }
  }

  async deleteOferta(
    id: string,
  ): Promise<{ data: null; message: string; success: boolean }> {
    const idValidation =
      await this.ofertasValidationService.validateOfertaId(id);

    if (!idValidation.isValid) {
      return idValidation.error;
    }

    try {
      const oferta = await this.ofertaModel.findById(id);
      if (!oferta) {
        return {
          data: null,
          message: 'Oferta no encontrada',
          success: false,
        };
      }

      await this.ofertaModel.findByIdAndDelete(id);

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
    id: string,
  ): Promise<{ data: any; message: string; success: boolean }> {
    const idValidation =
      await this.ofertasValidationService.validateOfertaId(id);

    if (!idValidation.isValid) {
      return idValidation.error;
    }

    try {
      const oferta = await this.ofertaModel.findById(id);
      if (!oferta) {
        return {
          data: [],
          message: 'Oferta no encontrada',
          success: false,
        };
      }

      const updatedOferta = await this.ofertaModel.findByIdAndUpdate(
        id,
        {
          activo: !oferta.activo,
          updatedAt: new Date(),
        },
        { new: true },
      );

      return {
        data: updatedOferta,
        message: `Oferta ${updatedOferta.activo ? 'activada' : 'desactivada'} exitosamente`,
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

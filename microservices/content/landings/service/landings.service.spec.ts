import { Injectable, Logger } from '@nestjs/common';
import { LandingErrorService } from './errors/landings-error.service';

@Injectable()
export class LandingValidationService {
  private readonly logger = new Logger(LandingValidationService.name);

  constructor(private readonly landingErrorService: LandingErrorService) {}

  async validateCreateLanding(
    createLandingDto: any,
    userId?: string,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!createLandingDto) {
      const error = new Error('Datos de landing son null o undefined');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateCreateLanding',
        {
          motivo: 'landing_data_null',
          createLandingDto,
          userId,
        },
      );
      this.logger.error('Error al validar datos de landing', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Datos de landing no válidos - los datos son requeridos',
          data: [],
        },
      };
    }

    if (!createLandingDto.title || createLandingDto.title.trim() === '') {
      const error = new Error('Landing sin título');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateCreateLanding',
        {
          motivo: 'titulo_vacio',
          createLandingDto,
          userId,
        },
      );
      this.logger.error('Error al validar título de landing', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Landing no válida - el título es requerido',
          data: [],
        },
      };
    }

    if (!createLandingDto.content || createLandingDto.content.trim() === '') {
      const error = new Error('Landing sin contenido');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateCreateLanding',
        {
          motivo: 'contenido_vacio',
          createLandingDto,
          userId,
        },
      );
      this.logger.error('Error al validar contenido de landing', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Landing no válida - el contenido es requerido',
          data: [],
        },
      };
    }

    if (!userId || userId.trim() === '') {
      const error = new Error('Usuario no proporcionado');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateCreateLanding',
        {
          motivo: 'usuario_null',
          createLandingDto,
          userId,
        },
      );
      this.logger.error('Error al validar usuario de landing', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Landing no válida - el usuario es requerido',
          data: [],
        },
      };
    }

    return { isValid: true };
  }

  async validateUpdateLanding(
    id: string,
    updateLandingDto: any,
    userId?: string,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!id || id.trim() === '') {
      const error = new Error('ID de landing no proporcionado');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateUpdateLanding',
        {
          motivo: 'id_null',
          id,
          updateLandingDto,
          userId,
        },
      );
      this.logger.error('Error al validar ID de landing', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Landing no válida - el ID es requerido',
          data: [],
        },
      };
    }

    if (!updateLandingDto) {
      const error = new Error('Datos de actualización son null o undefined');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateUpdateLanding',
        {
          motivo: 'update_data_null',
          id,
          updateLandingDto,
          userId,
        },
      );
      this.logger.error('Error al validar datos de actualización', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Datos de actualización no válidos - los datos son requeridos',
          data: [],
        },
      };
    }

    if (updateLandingDto.title && updateLandingDto.title.trim() === '') {
      const error = new Error('Título de landing vacío');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateUpdateLanding',
        {
          motivo: 'titulo_vacio_update',
          id,
          updateLandingDto,
          userId,
        },
      );
      this.logger.error('Error al validar título en actualización', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Actualización no válida - el título no puede estar vacío',
          data: [],
        },
      };
    }

    if (updateLandingDto.content && updateLandingDto.content.trim() === '') {
      const error = new Error('Contenido de landing vacío');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateUpdateLanding',
        {
          motivo: 'contenido_vacio_update',
          id,
          updateLandingDto,
          userId,
        },
      );
      this.logger.error('Error al validar contenido en actualización', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Actualización no válida - el contenido no puede estar vacío',
          data: [],
        },
      };
    }

    return { isValid: true };
  }

  async validateFormato(
    formatoDto: any,
    userId?: string,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!formatoDto) {
      const error = new Error('Datos de formato son null o undefined');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateFormato',
        {
          motivo: 'formato_data_null',
          formatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar datos de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Datos de formato no válidos - los datos son requeridos',
          data: [],
        },
      };
    }

    if (!formatoDto.name || formatoDto.name.trim() === '') {
      const error = new Error('Formato sin nombre');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateFormato',
        {
          motivo: 'nombre_formato_vacio',
          formatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar nombre de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Formato no válido - el nombre es requerido',
          data: [],
        },
      };
    }

    if (!formatoDto.template || formatoDto.template.trim() === '') {
      const error = new Error('Formato sin template');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateFormato',
        {
          motivo: 'template_vacio',
          formatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar template de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Formato no válido - el template es requerido',
          data: [],
        },
      };
    }

    const tiposValidos = ['html', 'react', 'jsx'];
    if (!formatoDto.type || !tiposValidos.includes(formatoDto.type)) {
      const error = new Error('Tipo de formato no válido');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateFormato',
        {
          motivo: 'tipo_formato_invalido',
          tipo: formatoDto.type,
          tiposValidos,
          formatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar tipo de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: `Formato no válido - tipo no permitido. Permitidos: ${tiposValidos.join(', ')}`,
          data: [],
        },
      };
    }

    if (!formatoDto.category || formatoDto.category.trim() === '') {
      const error = new Error('Formato sin categoría');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateFormato',
        {
          motivo: 'categoria_vacia',
          formatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar categoría de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Formato no válido - la categoría es requerida',
          data: [],
        },
      };
    }

    return { isValid: true };
  }

  async validateUpdateFormato(
    id: string,
    updateFormatoDto: any,
    userId?: string,
  ): Promise<{ isValid: boolean; error?: any }> {
    if (!id || id.trim() === '') {
      const error = new Error('ID de formato no proporcionado');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateUpdateFormato',
        {
          motivo: 'id_formato_null',
          id,
          updateFormatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar ID de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Formato no válido - el ID es requerido',
          data: [],
        },
      };
    }

    if (!updateFormatoDto) {
      const error = new Error('Datos de actualización de formato son null o undefined');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateUpdateFormato',
        {
          motivo: 'update_formato_data_null',
          id,
          updateFormatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar datos de actualización de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Datos de actualización no válidos - los datos son requeridos',
          data: [],
        },
      };
    }

    if (updateFormatoDto.name && updateFormatoDto.name.trim() === '') {
      const error = new Error('Nombre de formato vacío en actualización');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateUpdateFormato',
        {
          motivo: 'nombre_formato_vacio_update',
          id,
          updateFormatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar nombre en actualización de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Actualización no válida - el nombre no puede estar vacío',
          data: [],
        },
      };
    }

    if (updateFormatoDto.template && updateFormatoDto.template.trim() === '') {
      const error = new Error('Template de formato vacío en actualización');
      await this.landingErrorService.logMicroserviceError(
        error,
        userId,
        'validateUpdateFormato',
        {
          motivo: 'template_vacio_update',
          id,
          updateFormatoDto,
          userId,
        },
      );
      this.logger.error('Error al validar template en actualización de formato', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Actualización no válida - el template no puede estar vacío',
          data: [],
        },
      };
    }

    if (updateFormatoDto.type) {
      const tiposValidos = ['html', 'react', 'jsx'];
      if (!tiposValidos.includes(updateFormatoDto.type)) {
        const error = new Error('Tipo de formato no válido en actualización');
        await this.landingErrorService.logMicroserviceError(
          error,
          userId,
          'validateUpdateFormato',
          {
            motivo: 'tipo_formato_invalido_update',
            tipo: updateFormatoDto.type,
            tiposValidos,
            id,
            updateFormatoDto,
            userId,
          },
        );
        this.logger.error('Error al validar tipo en actualización de formato', error);
        return {
          isValid: false,
          error: {
            success: false,
            message: `Actualización no válida - tipo no permitido. Permitidos: ${tiposValidos.join(', ')}`,
            data: [],
          },
        };
      }
    }

    return { isValid: true };
  }

  async validatePaginationParams(
    page?: number,
    limit?: number,
  ): Promise<{ isValid: boolean; error?: any; page?: number; limit?: number }> {
    const defaultPage = 1;
    const defaultLimit = 10;

    const finalPage = page && page > 0 ? page : defaultPage;
    const finalLimit = limit && limit > 0 && limit <= 100 ? limit : defaultLimit;

    if (page && (page < 1 || !Number.isInteger(page))) {
      const error = new Error('Número de página inválido');
      this.logger.error('Error al validar página', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Parámetros no válidos - la página debe ser un número entero mayor a 0',
          data: [],
        },
      };
    }

    if (limit && (limit < 1 || limit > 100 || !Number.isInteger(limit))) {
      const error = new Error('Límite de página inválido');
      this.logger.error('Error al validar límite', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Parámetros no válidos - el límite debe ser un número entero entre 1 y 100',
          data: [],
        },
      };
    }

    return { isValid: true, page: finalPage, limit: finalLimit };
  }

  async validateSlug(slug: string): Promise<{ isValid: boolean; error?: any }> {
    if (!slug || slug.trim() === '') {
      const error = new Error('Slug no proporcionado');
      this.logger.error('Error al validar slug', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Parámetros no válidos - el slug es requerido',
          data: [],
        },
      };
    }

    // Validar formato del slug (solo letras, números, guiones y guiones bajos)
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(slug)) {
      const error = new Error('Formato de slug inválido');
      this.logger.error('Error al validar formato de slug', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Slug no válido - solo permite letras minúsculas, números, guiones y guiones bajos',
          data: [],
        },
      };
    }

    if (slug.length < 3 || slug.length > 100) {
      const error = new Error('Longitud de slug inválida');
      this.logger.error('Error al validar longitud de slug', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Slug no válido - debe tener entre 3 y 100 caracteres',
          data: [],
        },
      };
    }

    return { isValid: true };
  }

  async validateTemplateKey(templateKey: string): Promise<{ isValid: boolean; error?: any }> {
    if (!templateKey || templateKey.trim() === '') {
      const error = new Error('Template key no proporcionado');
      this.logger.error('Error al validar template key', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Template key no válido - es requerido',
          data: [],
        },
      };
    }

    // Validar que sea un identificador válido
    const keyRegex = /^[A-Z_]+$/;
    if (!keyRegex.test(templateKey)) {
      const error = new Error('Formato de template key inválido');
      this.logger.error('Error al validar formato de template key', error);
      return {
        isValid: false,
        error: {
          success: false,
          message: 'Template key no válido - solo permite mayúsculas y guiones bajos',
          data: [],
        },
      };
    }

    return { isValid: true };
  }
}
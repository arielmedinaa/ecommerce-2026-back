import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';
import { Prop } from '@nestjs/mongoose';

export class CreateComboDto {
  @IsString()
  codigo: string;

  @Prop({ type: String })
  codigoBarra: string;

  @Prop({ type: Object })
  marca: Record<string, any>;

  @Prop({ type: String })
  modelo: string;

  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  precio: number;

  @IsNumber()
  costo: number;

  @IsNumber()
  venta: number;

  @IsNumber()
  cantidad: number;

  @IsArray()
  @IsOptional()
  categorias?: Array<{
    _id: string;
    nombre: string;
    ruta: string;
  }>;

  @IsArray()
  @IsOptional()
  subcategorias?: Array<{
    _id: string;
    nombre: string;
    ruta: string;
  }>;

  @IsArray()
  @IsOptional()
  caracteristicas?: Array<{
    tipo: string;
    dato: string;
  }>;

  @IsArray()
  @IsOptional()
  imagenes?: string[];

  @IsNumber()
  @IsOptional()
  prioridad?: number;

  @IsNumber()
  @IsOptional()
  web?: number;

  @IsNumber()
  @IsOptional()
  websc?: number;

  @IsString()
  @IsOptional()
  deposito?: string;
}

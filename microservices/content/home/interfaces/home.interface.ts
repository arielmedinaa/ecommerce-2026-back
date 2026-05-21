import { ResponseData } from '@shared/common/response/response.data';
import { HomeSectionResponse } from './home-sections.interface';

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  order: number;
}

export interface HomeSubfamilia {
  id: number;
  subfamiliaId: number;
  familiaId: number;
  nombre: string;
}

export interface HomeCategoriaFamilia {
  id: number;
  nombre: string;
  subfamilias: HomeSubfamilia[];
}

export interface HomeData {
  sections: HomeSectionResponse[];
  categorias: HomeCategoriaFamilia[];
}

export type HomeResponse = ResponseData<HomeData>;

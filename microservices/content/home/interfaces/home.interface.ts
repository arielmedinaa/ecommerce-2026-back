import { ResponseData } from '@gateway/common/response/response.data';

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  order: number;
}

export interface HomeData {
  banners: Banner[];
  productos: any[];
  categorias: string[];
}

export type HomeResponse = ResponseData<HomeData>;
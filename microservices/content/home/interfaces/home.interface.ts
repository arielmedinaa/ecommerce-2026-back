import { ResponseData } from '@shared/common/response/response.data';

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  order: number;
}

export interface HomeData {
  banners: Banner[];
  productos: any[];
  jota: any[];
  ofertasExpress: any[];
}

export type HomeResponse = ResponseData<HomeData>;
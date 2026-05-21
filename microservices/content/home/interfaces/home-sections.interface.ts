import { HomeSectionType } from '../schemas/home-section.schema';

export interface HomeSectionResponse<TPayload = any> {
  key: string;
  type: HomeSectionType | string;
  orden: number;
  titulo?: string | null;
  payload: TPayload;
}


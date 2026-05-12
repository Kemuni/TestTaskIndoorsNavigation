export type HairTypeEnum = 'SHORT' | 'MEDIUM' | 'LONG' | 'HAIRLESS' | 'CURLY' | 'UNKNOWN';

export const HAIR_TYPE_LABELS: Record<HairTypeEnum, string> = {
  SHORT: 'Короткая шерсть',
  MEDIUM: 'Средняя шерсть',
  LONG: 'Длинная шерсть',
  HAIRLESS: 'Бесшёрстная',
  CURLY: 'Кудрявая шерсть',
  UNKNOWN: 'Неизвестно',
};

export interface Breed {
  id: number;
  name: string;
  description: string;
  hair_type: HairTypeEnum;
}

export interface BreedListResponse {
  success: boolean;
  data: Breed[];
  error: null;
}

export interface BreedResponse {
  success: boolean;
  data: Breed;
  error: null;
}

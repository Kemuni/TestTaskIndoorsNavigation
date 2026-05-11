import { Breed } from './breed.model';
import { User } from './user.model';

export type GenderEnum = 'M' | 'F';
export type StatusEnum = 'FOR_DEMONSTRATION' | 'AWAITING_OWNER' | 'GIVEN_AWAY' | 'CLOSED';

export interface CatImage {
  id: number;
  image_url: string;
  is_main: boolean;
  uploaded_at: string;
}

export interface CatOwner {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface ShortCat {
  id: number;
  name: string;
  gender: GenderEnum;
  color: string;
  age: number;
  age_months: number;
  breed: Breed;
}

export interface CatRead {
  id: number;
  name: string;
  birthday: string;
  owner: CatOwner;
  gender: GenderEnum;
  color: string;
  breed: Breed;
  current_weight: number;
  birth_weight: number;
  is_sterilized: boolean;
  description: string | null;
  mother: ShortCat | null;
  father: ShortCat | null;
  status: StatusEnum;
  created_at: string;
  updated_at: string;
  age: number;
  age_months: number;
  price: string | null;
  images: CatImage[];
}

export interface CatWrite {
  id?: number;
  name: string;
  birthday: string;
  gender: GenderEnum;
  color: string;
  breed_id: number;
  current_weight: number;
  birth_weight: number;
  is_sterilized: boolean;
  description: string | null;
  mother_id: number | null;
  father_id: number | null;
  status: StatusEnum;
  price: string | null;
}

export interface CatFilters {
  breed_id?: number;
  gender?: GenderEnum;
  status?: StatusEnum;
  min_age_months?: number;
  max_age_months?: number;
  price_min?: number;
  price_max?: number;
  current_weight_min?: number;
  current_weight_max?: number;
  is_free?: boolean;
  is_sterilized?: boolean;
  has_mother?: boolean;
  has_father?: boolean;
  owner_id?: number;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const GENDER_LABELS: Record<GenderEnum, string> = {
  M: 'Кот',
  F: 'Кошка',
};

export const STATUS_LABELS: Record<StatusEnum, string> = {
  FOR_DEMONSTRATION: 'Только показ',
  AWAITING_OWNER: 'Ищет хозяина',
  GIVEN_AWAY: 'Отдан',
  CLOSED: 'Закрыто',
};

export const STATUS_SEVERITY: Record<StatusEnum, string> = {
  FOR_DEMONSTRATION: 'info',
  AWAITING_OWNER: 'warn',
  GIVEN_AWAY: 'success',
  CLOSED: 'secondary',
};

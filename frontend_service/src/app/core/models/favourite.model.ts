import { CatRead } from './cat.model';

export interface FavouriteCat {
  id: number;
  cat: CatRead;
  uploaded_at: string;
}

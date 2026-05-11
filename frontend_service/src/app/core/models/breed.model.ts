export interface Breed {
  id: number;
  name: string;
  description: string;
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

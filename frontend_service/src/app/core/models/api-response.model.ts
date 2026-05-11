export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: ApiError | null;
}

export interface PaginationData<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: PaginationData<T>;
  error: ApiError | null;
}

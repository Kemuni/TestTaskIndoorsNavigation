import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FavouriteCat } from '../models/favourite.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class FavouritesService {
  private readonly http = inject(HttpClient);

  getFavourites(): Observable<PaginatedResponse<FavouriteCat>> {
    return this.http.get<PaginatedResponse<FavouriteCat>>('/api/favourite-cat/');
  }

  addFavourite(catId: number): Observable<ApiResponse<FavouriteCat>> {
    return this.http.post<ApiResponse<FavouriteCat>>('/api/favourite-cat/', { cat_id: catId });
  }

  getFavourite(catId: number): Observable<ApiResponse<FavouriteCat>> {
    return this.http.get<ApiResponse<FavouriteCat>>(`/api/favourite-cat/${catId}/`);
  }

  removeFavourite(favId: number): Observable<void> {
    return this.http.delete<void>(`/api/favourite-cat/${favId}/`);
  }
}

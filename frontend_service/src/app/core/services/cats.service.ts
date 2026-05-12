import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatFilters, CatRead, CatWrite } from '../models/cat.model';
import { CatImage } from '../models/cat.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class CatsService {
  private readonly http = inject(HttpClient);

  getCats(filters: CatFilters = {}): Observable<PaginatedResponse<CatRead>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PaginatedResponse<CatRead>>('/api/cat/', { params });
  }

  getCat(id: number): Observable<ApiResponse<CatRead>> {
    return this.http.get<ApiResponse<CatRead>>(`/api/cat/${id}/`);
  }

  createCat(payload: CatWrite): Observable<ApiResponse<CatRead>> {
    return this.http.post<ApiResponse<CatRead>>('/api/cat/', payload);
  }

  updateCat(id: number, payload: Partial<CatWrite>): Observable<ApiResponse<CatRead>> {
    return this.http.patch<ApiResponse<CatRead>>(`/api/cat/${id}/`, payload);
  }

  deleteCat(id: number): Observable<void> {
    return this.http.delete<void>(`/api/cat/${id}/`);
  }

  uploadImage(catId: number, file: File): Observable<ApiResponse<CatImage[]>> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<ApiResponse<CatImage[]>>(`/api/cat/${catId}/upload-image/`, form);
  }

  deleteImage(catId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`/api/cat/${catId}/images/${imageId}/`);
  }

  getCatsByBreed(breedId: number): Observable<ApiResponse<CatRead[]>> {
    return this.http.get<ApiResponse<CatRead[]>>(`/api/breed/${breedId}/cats/`);
  }

  getMyCats(): Observable<PaginatedResponse<CatRead>> {
    return this.http.get<PaginatedResponse<CatRead>>('/api/cat/my/');
  }

  getCatsByUser(userId: number): Observable<PaginatedResponse<CatRead>> {
    return this.http.get<PaginatedResponse<CatRead>>(`/api/cat/by-user/${userId}/`);
  }
}

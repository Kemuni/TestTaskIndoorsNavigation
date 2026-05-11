import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Breed } from '../models/breed.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class BreedsService {
  private readonly http = inject(HttpClient);

  getBreeds(page = 1, pageSize = 100): Observable<PaginatedResponse<Breed>> {
    const params = new HttpParams().set('page', page).set('page_size', pageSize);
    return this.http.get<PaginatedResponse<Breed>>('/api/breed/', { params });
  }

  getBreed(id: number): Observable<ApiResponse<Breed>> {
    return this.http.get<ApiResponse<Breed>>(`/api/breed/${id}/`);
  }
}

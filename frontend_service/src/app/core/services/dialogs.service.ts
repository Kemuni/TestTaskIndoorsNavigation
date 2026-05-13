import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DialogSummary, DialogWithMessages, ShortMessage } from '../models/dialog.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class DialogsService {
  private readonly http = inject(HttpClient);

  getDialogs(cursor?: string): Observable<PaginatedResponse<DialogSummary>> {
    let params = new HttpParams();
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<PaginatedResponse<DialogSummary>>('/api/dialog/', { params });
  }

  getDialog(id: number): Observable<ApiResponse<DialogWithMessages>> {
    return this.http.get<ApiResponse<DialogWithMessages>>(`/api/dialog/${id}/`);
  }

  getMessages(id: number): Observable<PaginatedResponse<ShortMessage>> {
    return this.http.get<PaginatedResponse<ShortMessage>>(`/api/dialog/${id}/messages/`);
  }

  getMessagesFromUrl(url: string): Observable<PaginatedResponse<ShortMessage>> {
    try {
      const parsed = new URL(url);
      return this.http.get<PaginatedResponse<ShortMessage>>(parsed.pathname + parsed.search);
    } catch {
      return this.http.get<PaginatedResponse<ShortMessage>>(url);
    }
  }
}

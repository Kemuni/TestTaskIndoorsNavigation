import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, UpdateUserData } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';

export interface EmailFreeResponse {
  email: string;
  is_free: boolean;
}

export interface ProfileImageData {
  image_url: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  getMyProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>('/api/profile/my/');
  }

  getProfile(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`/api/profile/${id}/`);
  }

  updateProfile(data: UpdateUserData): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>('/api/profile/personal/', data);
  }

  uploadProfilePhoto(file: File): Observable<ApiResponse<ProfileImageData>> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<ApiResponse<ProfileImageData>>('/api/profile/upload-image/', form);
  }

  deleteProfilePhoto(): Observable<void> {
    return this.http.delete<void>('/api/profile/remove_image/');
  }

  checkEmailFree(email: string): Observable<ApiResponse<EmailFreeResponse>> {
    return this.http.post<ApiResponse<EmailFreeResponse>>('/api/is_email_free/', { email });
  }
}

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/api/login/') &&
        !req.url.includes('/api/register/') &&
        !req.url.includes('/api/token/refresh/')
      ) {
        return handle401(error, req, next, authService, router);
      }
      return throwError(() => error);
    }),
  );
};

function handle401(
  error: HttpErrorResponse,
  req: Parameters<HttpInterceptorFn>[0],
  next: Parameters<HttpInterceptorFn>[1],
  authService: AuthService,
  router: Router,
) {
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) =>
        next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
      ),
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  const refresh = authService.getRefreshToken();
  if (!refresh) {
    isRefreshing = false;
    authService.logout();
    router.navigate(['/auth/login']);
    return throwError(() => error);
  }

  return authService.refreshToken().pipe(
    switchMap((res) => {
      isRefreshing = false;
      const newToken = res.data.access;
      refreshTokenSubject.next(newToken);
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
    }),
    catchError((refreshError) => {
      isRefreshing = false;
      authService.logout();
      router.navigate(['/auth/login']);
      return throwError(() => refreshError);
    }),
  );
}

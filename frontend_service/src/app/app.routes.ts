import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'cats', pathMatch: 'full' },

  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  {
    path: 'cats',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/cats/cat-list/cat-list.component').then(
            (m) => m.CatListComponent,
          ),
      },
      {
        path: 'new',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/cats/cat-form/cat-form.component').then(
            (m) => m.CatFormComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/cats/cat-detail/cat-detail.component').then(
            (m) => m.CatDetailComponent,
          ),
      },
      {
        path: ':id/edit',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/cats/cat-form/cat-form.component').then(
            (m) => m.CatFormComponent,
          ),
      },
    ],
  },

  {
    path: 'profile',
    children: [
      {
        path: 'me',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/profile/my-profile/my-profile.component').then(
            (m) => m.MyProfileComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/profile/user-profile/user-profile.component').then(
            (m) => m.UserProfileComponent,
          ),
      },
    ],
  },

  {
    path: 'dialogs',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dialogs/dialog-list/dialog-list.component').then(
            (m) => m.DialogListComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/dialogs/dialog-detail/dialog-detail.component').then(
            (m) => m.DialogDetailComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'cats' },
];

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ButtonModule, AvatarModule, MenuModule],
  template: `
    <nav
      class="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm"
      aria-label="Главная навигация"
    >
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <!-- Logo -->
        <a
          routerLink="/cats"
          class="flex items-center gap-2 text-xl font-bold text-violet-700 shrink-0"
          aria-label="CatPost — на главную"
        >
          🐱 CatPost
        </a>

        <!-- Nav links -->
        <ul class="hidden md:flex items-center gap-1 list-none m-0 p-0" role="list">
          <li>
            <a
              routerLink="/cats"
              routerLinkActive="text-violet-700 font-semibold"
              class="px-3 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors"
            >
              Объявления
            </a>
          </li>
          @if (isAuthenticated()) {
            <li>
              <a
                routerLink="/dialogs"
                routerLinkActive="text-violet-700 font-semibold"
                class="px-3 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors"
              >
                Диалоги
              </a>
            </li>
          }
        </ul>

        <!-- Right side -->
        <div class="flex items-center gap-2">
          @if (isAuthenticated()) {
            <a
              routerLink="/cats/new"
              class="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
              aria-label="Добавить объявление"
            >
              + Добавить
            </a>

            <p-menu #menu [model]="menuItems" [popup]="true" />
            <button
              type="button"
              (click)="menu.toggle($event)"
              class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              [attr.aria-label]="'Меню пользователя ' + currentUser()?.first_name"
              aria-haspopup="true"
            >
              <p-avatar
                [label]="userInitials()"
                shape="circle"
                styleClass="bg-violet-100 text-violet-700 font-semibold text-sm"
              />
              <span class="hidden sm:block text-sm font-medium">
                {{ currentUser()?.first_name }}
              </span>
            </button>
          } @else {
            <a
              routerLink="/auth/login"
              class="px-3 py-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
            >
              Войти
            </a>
            <a
              routerLink="/auth/register"
              class="px-3 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              Регистрация
            </a>
          }
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;

  readonly userInitials = () => {
    const u = this.currentUser();
    if (!u) return '?';
    return `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase();
  };

  readonly menuItems: MenuItem[] = [
    {
      label: 'Мой профиль',
      icon: 'pi pi-user',
      command: () => this.router.navigate(['/profile/me']),
    },
    {
      label: 'Добавить объявление',
      icon: 'pi pi-plus',
      command: () => this.router.navigate(['/cats/new']),
    },
    { separator: true },
    {
      label: 'Выйти',
      icon: 'pi pi-sign-out',
      command: () => {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      },
    },
  ];
}

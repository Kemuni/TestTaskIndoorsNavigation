import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
          class="flex items-center gap-2 text-xl font-bold text-gray-900 shrink-0"
          aria-label="CatPost — на главную"
        >
          ТвояКошка
        </a>

        <!-- Nav links (desktop) -->
        <ul class="hidden md:flex items-center gap-1 list-none m-0 p-0" role="list">
          <li>
            <a
              routerLink="/cats"
              routerLinkActive="text-gray-900 font-semibold"
              class="px-3 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors"
            >
              Объявления
            </a>
          </li>
          @if (isAuthenticated()) {
            <li>
              <a
                routerLink="/dialogs"
                routerLinkActive="text-gray-900 font-semibold"
                class="px-3 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors"
              >
                Диалоги
              </a>
            </li>
            <li>
              <a
                routerLink="/favourites"
                routerLinkActive="text-gray-900 font-semibold"
                class="px-3 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors"
              >
                Избранное
              </a>
            </li>
          }
        </ul>

        <!-- Right side -->
        <div class="flex items-center gap-2">
          @if (isAuthenticated()) {
            <a
              routerLink="/cats/new"
              class="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              style="color: #fff;"
              aria-label="Добавить объявление"
            >
              + Добавить
            </a>

            <!-- Desktop user menu -->
            <p-menu #menu [model]="menuItems" [popup]="true" />
            <button
              type="button"
              (click)="menu.toggle($event)"
              class="hidden md:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              [attr.aria-label]="'Меню пользователя ' + currentUser()?.first_name"
              aria-haspopup="true"
            >
              <p-avatar
                [label]="userInitials()"
                shape="circle"
                styleClass="bg-gray-100 text-gray-700 font-semibold text-sm"
              />
              <span class="hidden sm:block text-sm font-medium">
                {{ currentUser()?.first_name }}
              </span>
            </button>
          } @else {
            <a
              routerLink="/auth/login"
              class="hidden md:block px-3 py-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
            >
              Войти
            </a>
            <a
              routerLink="/auth/register"
              class="hidden md:block px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              style="color: #fff;"
            >
              Регистрация
            </a>
          }

          <!-- Burger button (mobile only) -->
          <button
            type="button"
            class="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            (click)="mobileMenuOpen.update(v => !v)"
            [attr.aria-expanded]="mobileMenuOpen()"
            aria-label="Открыть меню"
          >
            <i class="pi text-xl" [class]="mobileMenuOpen() ? 'pi-times' : 'pi-bars'" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Mobile dropdown -->
      @if (mobileMenuOpen()) {
        <div class="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-1" role="menu">
          <a
            routerLink="/cats"
            routerLinkActive="font-semibold"
            class="py-2 px-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
            (click)="mobileMenuOpen.set(false)"
            role="menuitem"
          >Объявления</a>
          @if (isAuthenticated()) {
            <a
              routerLink="/dialogs"
              routerLinkActive="font-semibold"
              class="py-2 px-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              (click)="mobileMenuOpen.set(false)"
              role="menuitem"
            >Диалоги</a>
            <a
              routerLink="/favourites"
              routerLinkActive="font-semibold"
              class="py-2 px-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              (click)="mobileMenuOpen.set(false)"
              role="menuitem"
            >Избранное</a>
            <a
              routerLink="/cats/new"
              class="py-2 px-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              (click)="mobileMenuOpen.set(false)"
              role="menuitem"
            >+ Добавить объявление</a>
            <a
              routerLink="/profile/me"
              class="py-2 px-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              (click)="mobileMenuOpen.set(false)"
              role="menuitem"
            >Мой профиль</a>
            <button
              type="button"
              class="text-left py-2 px-2 text-sm text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              (click)="logout()"
              role="menuitem"
            >Выйти</button>
          } @else {
            <a
              routerLink="/auth/login"
              class="py-2 px-2 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              (click)="mobileMenuOpen.set(false)"
              role="menuitem"
            >Войти</a>
            <a
              routerLink="/auth/register"
              class="py-2 px-2 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
              (click)="mobileMenuOpen.set(false)"
              role="menuitem"
            >Регистрация</a>
          }
        </div>
      }
    </nav>
  `,
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;
  readonly mobileMenuOpen = signal(false);

  readonly userInitials = () => {
    const u = this.currentUser();
    if (!u) return '?';
    return `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase();
  };

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
    this.mobileMenuOpen.set(false);
  }

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

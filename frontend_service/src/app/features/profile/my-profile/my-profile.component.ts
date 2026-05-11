import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CatsService } from '../../../core/services/cats.service';
import { CatRead } from '../../../core/models/cat.model';
import { CatCardComponent } from '../../../shared/components/cat-card/cat-card.component';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-my-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CatCardComponent, ButtonModule, SkeletonModule, AvatarModule, MessageModule],
  template: `
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Profile header -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8 flex flex-col sm:flex-row items-start gap-6">
        <div class="relative">
          <p-avatar
            [label]="initials()"
            shape="circle"
            size="xlarge"
            styleClass="bg-violet-100 text-violet-700 font-bold text-2xl w-20 h-20"
            aria-hidden="true"
          />
          <!-- Profile photo stub -->
          <button
            type="button"
            class="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center hover:bg-violet-700 transition-colors"
            title="Изменить фото профиля (скоро)"
            disabled
            aria-label="Изменить фото профиля (функция в разработке)"
          >
            <i class="pi pi-camera text-xs" aria-hidden="true"></i>
          </button>
        </div>

        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-slate-900">
            {{ user()?.first_name }} {{ user()?.last_name }}
          </h1>
          <p class="text-slate-500 text-sm mt-0.5">{{ user()?.email }}</p>

          <!-- Edit stub -->
          <details class="mt-4">
            <summary class="text-sm text-violet-600 hover:text-violet-700 cursor-pointer font-medium">
              Редактировать профиль
            </summary>
            <div class="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p-message
                severity="info"
                text="Редактирование профиля будет доступно после добавления соответствующего API-эндпоинта."
                styleClass="w-full"
              />
              <div class="mt-3 flex flex-col gap-3 opacity-50 pointer-events-none" aria-hidden="true">
                <div>
                  <label class="text-xs font-medium text-slate-600">Имя</label>
                  <input type="text" class="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" [value]="user()?.first_name" disabled />
                </div>
                <div>
                  <label class="text-xs font-medium text-slate-600">Фамилия</label>
                  <input type="text" class="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" [value]="user()?.last_name" disabled />
                </div>
                <button disabled class="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium">Сохранить</button>
              </div>
            </div>
          </details>

          <!-- Profile photo section -->
          <details class="mt-2">
            <summary class="text-sm text-violet-600 hover:text-violet-700 cursor-pointer font-medium">
              Фото профиля
            </summary>
            <div class="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p-message
                severity="info"
                text="Управление фото профиля будет доступно после добавления соответствующего API-эндпоинта."
                styleClass="w-full"
              />
              <div class="mt-3 flex gap-2 opacity-50 pointer-events-none" aria-hidden="true">
                <button disabled class="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">Загрузить фото</button>
                <button disabled class="px-3 py-2 bg-white border border-red-200 text-red-500 rounded-lg text-sm">Удалить</button>
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- My listings -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-slate-900">Мои объявления</h2>
          <a
            routerLink="/cats/new"
            class="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            + Добавить
          </a>
        </div>

        @if (catsLoading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (i of [1,2,3]; track i) {
              <div class="rounded-2xl overflow-hidden border border-slate-100 bg-white">
                <p-skeleton height="180px" />
                <div class="p-4 flex flex-col gap-2">
                  <p-skeleton width="70%" height="18px" />
                  <p-skeleton width="40%" height="14px" />
                </div>
              </div>
            }
          </div>
        } @else if (catsError()) {
          <div class="text-center py-10 text-slate-400" role="alert">
            <div class="text-4xl mb-2" aria-hidden="true">⚠️</div>
            <p class="text-sm font-medium text-slate-600">Не удалось загрузить объявления</p>
          </div>
        } @else if (myCats().length === 0) {
          <div class="text-center py-12 text-slate-400">
            <div class="text-5xl mb-3" aria-hidden="true">🐱</div>
            <p class="font-medium">У вас пока нет объявлений</p>
            <a routerLink="/cats/new" class="mt-2 inline-block text-sm text-violet-600 hover:underline">
              Создать первое объявление
            </a>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (cat of myCats(); track cat.id) {
              <app-cat-card [cat]="cat" />
            }
          </div>
        }
      </div>
    </main>
  `,
})
export class MyProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly catsService = inject(CatsService);

  readonly user = this.authService.currentUser;
  readonly myCats = signal<CatRead[]>([]);
  readonly catsLoading = signal(false);
  readonly catsError = signal(false);

  readonly initials = () => {
    const u = this.user();
    if (!u) return '?';
    return `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase();
  };

  ngOnInit(): void {
    const userId = this.user()?.id;
    if (!userId) return;

    this.catsLoading.set(true);
    this.catsService.getCats({ owner_id: userId, page_size: 50 }).subscribe({
      next: (res) => {
        this.myCats.set(res.data.results);
        this.catsLoading.set(false);
        this.catsError.set(false);
      },
      error: () => {
        this.catsLoading.set(false);
        this.catsError.set(true);
      },
    });
  }
}

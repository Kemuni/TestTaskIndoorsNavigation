import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DialogSummary } from '../../../core/models/dialog.model';
import { AuthService } from '../../../core/services/auth.service';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-dialog-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SkeletonModule, BadgeModule],
  template: `
    <main class="max-w-2xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-slate-900 mb-6">Диалоги</h1>

      @if (loading()) {
        <div class="flex flex-col gap-3" aria-label="Загрузка диалогов" aria-live="polite">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="bg-white rounded-xl p-4 flex items-center gap-3">
              <p-skeleton shape="circle" size="3rem" />
              <div class="flex-1">
                <p-skeleton width="40%" styleClass="mb-2" />
                <p-skeleton width="70%" />
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="text-center py-20 text-slate-400" role="alert">
          <div class="text-5xl mb-3" aria-hidden="true">⚠️</div>
          <p class="font-medium text-slate-600">Не удалось загрузить диалоги</p>
          <p class="text-sm mt-1">Сервер недоступен — попробуйте позже</p>
          <button
            type="button"
            class="mt-4 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            (click)="loadDialogs()"
          >
            Повторить
          </button>
        </div>
      } @else if (dialogs().length === 0) {
        <div class="text-center py-20 text-slate-400">
          <p class="font-medium">У вас пока нет диалогов</p>
          <p class="text-sm mt-1">
            Найдите объявление и свяжитесь с продавцом
          </p>
          <a routerLink="/cats" class="mt-4 inline-block text-gray-900 hover:underline text-sm font-medium">
            Смотреть объявления
          </a>
        </div>
      } @else {
        <ul class="flex flex-col gap-2 list-none p-0 m-0" aria-label="Список диалогов">
          @for (dialog of dialogs(); track dialog.id) {
            <li>
              <a
                [routerLink]="['/dialogs', dialog.id]"
                class="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-100 hover:border-gray-200 hover:shadow-sm transition-all"
                [attr.aria-label]="'Диалог с ' + dialog.with_user.first_name + ' ' + dialog.with_user.last_name"
              >
                <!-- Avatar -->
                @if (dialog.with_user.image_url) {
                  <img
                    [src]="dialog.with_user.image_url"
                    [alt]="dialog.with_user.first_name + ' ' + dialog.with_user.last_name"
                    class="w-12 h-12 rounded-full object-cover"
                    aria-hidden="true"
                  />
                } @else {
                  <span class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-semibold text-xs" aria-hidden="true">
                    {{ dialog.with_user.first_name[0] }}{{ dialog.with_user.last_name[0] }}
                  </span>
                }

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-slate-900 truncate">
                      {{ dialog.with_user.first_name }} {{ dialog.with_user.last_name }}
                    </span>
                    @if (dialog.last_message) {
                      <time
                        class="text-xs text-slate-400 shrink-0"
                        [attr.datetime]="dialog.last_message.created_at"
                      >
                        {{ formatDate(dialog.last_message.created_at) }}
                      </time>
                    }
                  </div>
                  @if (dialog.last_message) {
                    <p class="text-sm text-slate-500 truncate mt-0.5">
                      @if (dialog.last_message.sender_id === currentUserId()) {
                        <span class="text-slate-400">Вы: </span>
                      }
                      {{ dialog.last_message.content }}
                    </p>
                  }
                </div>

                <!-- Unread badge -->
                @if (dialog.unread_count > 0) {
                  <p-badge
                    [value]="dialog.unread_count.toString()"
                    severity="danger"
                    aria-label="{{ dialog.unread_count }} непрочитанных"
                  />
                }
              </a>
            </li>
          }
        </ul>

        @if (nextCursor()) {
          <div class="mt-4 text-center">
            <button
              type="button"
              class="px-4 py-2 text-sm text-gray-900 hover:text-gray-700 font-medium"
              (click)="loadMore()"
              [disabled]="loading()"
            >
              Загрузить ещё
            </button>
          </div>
        }
      }
    </main>
  `,
})
export class DialogListComponent implements OnInit {
  private readonly dialogsService = inject(DialogsService);
  private readonly authService = inject(AuthService);

  readonly dialogs = signal<DialogSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly nextCursor = signal<string | null>(null);

  readonly currentUserId = () => this.authService.currentUser()?.id ?? null;

  ngOnInit(): void {
    this.loadDialogs();
  }

  loadDialogs(cursor?: string): void {
    this.loading.set(true);
    this.dialogsService.getDialogs(cursor).subscribe({
      next: (res) => {
        if (cursor) {
          this.dialogs.update((prev) => [...prev, ...res.data.results]);
        } else {
          this.dialogs.set(res.data.results);
        }
        this.nextCursor.set(res.data.next ? this.extractCursor(res.data.next) : null);
        this.loading.set(false);
        this.error.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (cursor) this.loadDialogs(cursor);
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  }

  private extractCursor(url: string): string {
    try {
      return new URL(url).searchParams.get('cursor') ?? '';
    } catch {
      return '';
    }
  }
}

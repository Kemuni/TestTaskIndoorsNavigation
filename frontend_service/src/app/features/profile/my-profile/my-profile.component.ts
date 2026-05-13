import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { CatsService } from '../../../core/services/cats.service';
import { CatRead } from '../../../core/models/cat.model';
import { User } from '../../../core/models/user.model';
import { CatCardComponent } from '../../../shared/components/cat-card/cat-card.component';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';
import { MessageModule } from 'primeng/message';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-my-profile',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [RouterLink, ReactiveFormsModule, CatCardComponent, ButtonModule, SkeletonModule, AvatarModule, MessageModule, InputTextModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Profile header -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8 flex flex-col sm:flex-row items-start gap-6">
        <!-- Avatar / Photo -->
        <div class="relative shrink-0">
          @if (profileUser()?.image_url) {
            <img
              [src]="profileUser()!.image_url!"
              [alt]="'Фото ' + profileUser()!.first_name"
              class="w-20 h-20 rounded-full object-cover"
            />
          } @else {
            <p-avatar
              [label]="initials()"
              shape="circle"
              size="xlarge"
              styleClass="bg-gray-100 text-gray-700 font-bold text-2xl w-20 h-20"
              aria-hidden="true"
            />
          }
          <button
            type="button"
            class="absolute -bottom-1 -right-1 w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
            title="Загрузить фото профиля"
            (click)="photoInput.click()"
            [disabled]="photoUploading()"
            aria-label="Изменить фото профиля"
          >
            <i class="pi pi-camera text-xs" aria-hidden="true"></i>
          </button>
          <input
            #photoInput
            type="file"
            accept="image/*"
            class="hidden"
            aria-hidden="true"
            (change)="onPhotoSelected($event)"
          />
        </div>

        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-slate-900">
            {{ profileUser()?.first_name }} {{ profileUser()?.last_name }}
          </h1>
          <p class="text-slate-500 text-sm mt-0.5">{{ profileUser()?.email }}</p>

          @if (profileUser()?.image_url) {
            <button
              type="button"
              class="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors"
              (click)="deletePhoto()"
              [disabled]="photoUploading()"
            >
              Удалить фото
            </button>
          }

          <!-- Edit profile form -->
          <details class="mt-4" #editDetails>
            <summary class="text-sm text-gray-900 hover:text-gray-700 cursor-pointer font-medium">
              Редактировать профиль
            </summary>
            <div class="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <form
                [formGroup]="editForm"
                (ngSubmit)="onSaveProfile()"
                class="flex flex-col gap-3"
                novalidate
                aria-label="Редактирование профиля"
              >
                @if (editError()) {
                  <p-message severity="error" [text]="editError()!" styleClass="w-full" />
                }
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label for="edit-first-name" class="text-xs font-medium text-slate-600">Имя</label>
                    <input
                      id="edit-first-name"
                      pInputText
                      type="text"
                      formControlName="first_name"
                      class="w-full"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="edit-last-name" class="text-xs font-medium text-slate-600">Фамилия</label>
                    <input
                      id="edit-last-name"
                      pInputText
                      type="text"
                      formControlName="last_name"
                      class="w-full"
                    />
                  </div>
                </div>
                <p-button
                  type="submit"
                  label="Сохранить"
                  [loading]="editLoading()"
                  styleClass="w-full"
                />
              </form>
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
            class="text-sm text-gray-900 hover:text-gray-700 font-medium"
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
            <p class="font-medium">У вас пока нет объявлений</p>
            <a routerLink="/cats/new" class="mt-2 inline-block text-sm text-gray-900 hover:underline">
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
  private readonly usersService = inject(UsersService);
  private readonly catsService = inject(CatsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  readonly profileUser = signal<User | null>(null);
  readonly myCats = signal<CatRead[]>([]);
  readonly catsLoading = signal(false);
  readonly catsError = signal(false);
  readonly editLoading = signal(false);
  readonly editError = signal<string | null>(null);
  readonly photoUploading = signal(false);

  readonly editForm = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
  });

  readonly initials = () => {
    const u = this.profileUser();
    if (!u) return '?';
    return `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase();
  };

  ngOnInit(): void {
    // Load full profile (includes image_url)
    this.usersService.getMyProfile().subscribe({
      next: (res) => {
        this.profileUser.set(res.data);
        this.editForm.patchValue({
          first_name: res.data.first_name,
          last_name: res.data.last_name,
        });
      },
      error: () => {
        // fallback to auth user
        const u = this.authService.currentUser();
        if (u) this.profileUser.set(u);
      },
    });

    this.catsLoading.set(true);
    this.catsService.getMyCats().subscribe({
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

  onSaveProfile(): void {
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid || this.editLoading()) return;

    this.editLoading.set(true);
    this.editError.set(null);

    this.usersService.updateProfile(this.editForm.getRawValue()).subscribe({
      next: (res) => {
        this.editLoading.set(false);
        this.profileUser.set(res.data);
        this.authService.updateCurrentUser(res.data);
        this.messageService.add({ severity: 'success', summary: 'Сохранено', detail: 'Профиль обновлён' });
      },
      error: (err: unknown) => {
        this.editLoading.set(false);
        const msg =
          (err as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'Не удалось сохранить данные';
        this.editError.set(msg);
      },
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.photoUploading.set(true);
    this.usersService.uploadProfilePhoto(file).subscribe({
      next: (res) => {
        this.photoUploading.set(false);
        this.profileUser.update((u) => u ? { ...u, image_url: res.data.image_url } : u);
        this.authService.updateCurrentUser({ ...this.authService.currentUser()!, image_url: res.data.image_url });
        this.messageService.add({ severity: 'success', summary: 'Готово', detail: 'Фото профиля обновлено' });
        input.value = '';
      },
      error: () => {
        this.photoUploading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить фото' });
      },
    });
  }

  deletePhoto(): void {
    this.photoUploading.set(true);
    this.usersService.deleteProfilePhoto().subscribe({
      next: () => {
        this.photoUploading.set(false);
        this.profileUser.update((u) => u ? { ...u, image_url: null } : u);
        this.authService.updateCurrentUser({ ...this.authService.currentUser()!, image_url: null });
        this.messageService.add({ severity: 'success', summary: 'Готово', detail: 'Фото профиля удалено' });
      },
      error: () => {
        this.photoUploading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось удалить фото' });
      },
    });
  }
}

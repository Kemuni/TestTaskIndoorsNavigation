import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  template: `
    <main class="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="text-5xl mb-3" aria-hidden="true">🐱</div>
          <h1 class="text-2xl font-bold text-slate-900">Регистрация в CatPost</h1>
          <p class="text-slate-500 mt-1 text-sm">Создайте аккаунт, чтобы добавлять объявления</p>
        </div>

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4"
          novalidate
          aria-label="Форма регистрации"
        >
          @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage()!" styleClass="w-full" />
          }

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label for="reg-first-name" class="text-sm font-medium text-slate-700">Имя</label>
              <input
                id="reg-first-name"
                pInputText
                type="text"
                formControlName="first_name"
                autocomplete="given-name"
                placeholder="Иван"
                class="w-full"
                [attr.aria-invalid]="fieldInvalid('first_name')"
                aria-describedby="reg-first-name-error"
              />
              @if (fieldInvalid('first_name')) {
                <span id="reg-first-name-error" class="text-xs text-red-600" role="alert">
                  Обязательное поле
                </span>
              }
            </div>

            <div class="flex flex-col gap-1">
              <label for="reg-last-name" class="text-sm font-medium text-slate-700">Фамилия</label>
              <input
                id="reg-last-name"
                pInputText
                type="text"
                formControlName="last_name"
                autocomplete="family-name"
                placeholder="Иванов"
                class="w-full"
                [attr.aria-invalid]="fieldInvalid('last_name')"
                aria-describedby="reg-last-name-error"
              />
              @if (fieldInvalid('last_name')) {
                <span id="reg-last-name-error" class="text-xs text-red-600" role="alert">
                  Обязательное поле
                </span>
              }
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label for="reg-email" class="text-sm font-medium text-slate-700">Email</label>
            <input
              id="reg-email"
              pInputText
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full"
              [attr.aria-invalid]="fieldInvalid('email')"
              aria-describedby="reg-email-error"
            />
            @if (fieldInvalid('email')) {
              <span id="reg-email-error" class="text-xs text-red-600" role="alert">
                Введите корректный email
              </span>
            }
          </div>

          <div class="flex flex-col gap-1">
            <label for="reg-password" class="text-sm font-medium text-slate-700">Пароль</label>
            <p-password
              inputId="reg-password"
              formControlName="password"
              [toggleMask]="true"
              autocomplete="new-password"
              placeholder="Минимум 8 символов"
              styleClass="w-full"
              inputStyleClass="w-full"
              [attr.aria-invalid]="fieldInvalid('password')"
              aria-describedby="reg-password-error"
            />
            @if (fieldInvalid('password')) {
              <span id="reg-password-error" class="text-xs text-red-600" role="alert">
                Пароль должен содержать минимум 8 символов
              </span>
            }
          </div>

          <p-button
            type="submit"
            label="Зарегистрироваться"
            [loading]="loading()"
            styleClass="w-full mt-2"
          />
        </form>

        <p class="text-center text-sm text-slate-500 mt-4">
          Уже есть аккаунт?
          <a routerLink="/auth/login" class="text-violet-600 hover:underline font-medium">
            Войти
          </a>
        </p>
      </div>
    </main>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  fieldInvalid(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && ctrl.touched;
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/cats']);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const msg =
          (err as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'Ошибка при регистрации. Проверьте данные.';
        this.errorMessage.set(msg);
      },
    });
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  template: `
    <main class="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="text-5xl mb-3" aria-hidden="true">🐱</div>
          <h1 class="text-2xl font-bold text-slate-900">Войти в CatPost</h1>
          <p class="text-slate-500 mt-1 text-sm">Введите свои данные для входа</p>
        </div>

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4"
          novalidate
          aria-label="Форма входа"
        >
          @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage()!" styleClass="w-full" />
          }

          <div class="flex flex-col gap-1">
            <label for="login-email" class="text-sm font-medium text-slate-700">Email</label>
            <input
              id="login-email"
              pInputText
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full"
              [attr.aria-invalid]="emailInvalid()"
              aria-describedby="login-email-error"
            />
            @if (emailInvalid()) {
              <span id="login-email-error" class="text-xs text-red-600" role="alert">
                Введите корректный email
              </span>
            }
          </div>

          <div class="flex flex-col gap-1">
            <label for="login-password" class="text-sm font-medium text-slate-700">Пароль</label>
            <p-password
              inputId="login-password"
              formControlName="password"
              [feedback]="false"
              [toggleMask]="true"
              autocomplete="current-password"
              placeholder="••••••••"
              styleClass="w-full"
              inputStyleClass="w-full"
              [attr.aria-invalid]="passwordInvalid()"
              aria-describedby="login-password-error"
            />
            @if (passwordInvalid()) {
              <span id="login-password-error" class="text-xs text-red-600" role="alert">
                Введите пароль
              </span>
            }
          </div>

          <p-button
            type="submit"
            label="Войти"
            [loading]="loading()"
            [disabled]="form.invalid && form.touched"
            styleClass="w-full mt-2"
          />
        </form>

        <p class="text-center text-sm text-slate-500 mt-4">
          Нет аккаунта?
          <a routerLink="/auth/register" class="text-violet-600 hover:underline font-medium">
            Зарегистрироваться
          </a>
        </p>
      </div>
    </main>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly emailInvalid = () =>
    this.form.controls.email.invalid && this.form.controls.email.touched;
  readonly passwordInvalid = () =>
    this.form.controls.password.invalid && this.form.controls.password.touched;

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/cats']);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const msg =
          (err as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'Неверный email или пароль';
        this.errorMessage.set(msg);
      },
    });
  }
}

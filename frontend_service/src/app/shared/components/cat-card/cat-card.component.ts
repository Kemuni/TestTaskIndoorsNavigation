import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { CatRead, GENDER_LABELS, STATUS_LABELS, STATUS_SEVERITY } from '../../../core/models/cat.model';

@Component({
  selector: 'app-cat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TagModule],
  template: `
    <article
      class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
      [attr.aria-label]="'Объявление: ' + cat().name"
    >
      <!-- Image -->
      <a [routerLink]="['/cats', cat().id]" class="block aspect-[4/3] overflow-hidden bg-slate-100 relative">
        @if (displayImage()) {
          <img
            [src]="displayImage()!.image_url"
            [alt]="'Фото ' + cat().name"
            class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        } @else {
          <div
            class="w-full h-full flex flex-col items-center justify-center text-slate-400"
            aria-hidden="true"
          >
            <span class="text-5xl">🐱</span>
            <span class="text-sm mt-2">Нет фото</span>
          </div>
        }
        @if (cat().images.length > 1) {
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1" aria-hidden="true">
            @for (img of cat().images; track img.id; let i = $index) {
              <span
                class="w-1.5 h-1.5 rounded-full transition-colors"
                [class]="i === activeIndex() ? 'bg-white' : 'bg-white/50'"
              ></span>
            }
          </div>
        }
      </a>

      <!-- Content -->
      <div class="p-4 flex flex-col gap-2 flex-1">
        <div class="flex items-start justify-between gap-2">
          <a
            [routerLink]="['/cats', cat().id]"
            class="text-base font-semibold text-slate-900 hover:text-gray-700 transition-colors line-clamp-1"
          >
            {{ cat().name }}
          </a>
          <p-tag
            [value]="statusLabel()"
            [severity]="statusSeverity()"
            styleClass="shrink-0 text-xs"
          />
        </div>

        <p class="text-sm text-slate-500 line-clamp-1">{{ cat().breed.name }}</p>

        <div class="flex items-center gap-3 text-sm text-slate-600">
          <span>{{ genderLabel() }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ ageLabel() }}</span>
        </div>

        <div class="mt-auto pt-2 flex items-center justify-between">
          @if (cat().price) {
            <span class="text-base font-bold text-gray-900">{{ cat().price }} ₽</span>
          } @else {
            <span class="text-base font-semibold text-green-600">Бесплатно</span>
          }
          <a
            [routerLink]="['/profile', cat().owner.id]"
            class="text-xs text-slate-400 hover:text-gray-700 transition-colors"
          >
            {{ cat().owner.first_name }} {{ cat().owner.last_name }}
          </a>
        </div>
      </div>
    </article>
  `,
})
export class CatCardComponent implements OnInit, OnDestroy {
  readonly cat = input.required<CatRead>();

  private intervalId: ReturnType<typeof setInterval> | null = null;
  readonly activeIndex = signal(0);

  readonly displayImage = computed(() => {
    const images = this.cat().images;
    if (!images.length) return null;
    return images[this.activeIndex()] ?? images[0];
  });

  ngOnInit(): void {
    if (this.cat().images.length > 1) {
      this.intervalId = setInterval(() => {
        this.activeIndex.update((i) => (i + 1) % this.cat().images.length);
      }, 3000);
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
  }

  readonly statusLabel = computed(() => STATUS_LABELS[this.cat().status]);
  readonly statusSeverity = computed(() => STATUS_SEVERITY[this.cat().status] as 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast');
  readonly genderLabel = computed(() => GENDER_LABELS[this.cat().gender]);
  readonly ageLabel = computed(() => {
    const months = this.cat().age_months;
    if (months < 12) return `${months} мес.`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem ? `${years} г. ${rem} мес.` : `${years} г.`;
  });
}

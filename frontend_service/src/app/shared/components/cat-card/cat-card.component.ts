import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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
      <a [routerLink]="['/cats', cat().id]" class="block aspect-[4/3] overflow-hidden bg-slate-100">
        @if (mainImage()) {
          <img
            [src]="mainImage()!.image_url"
            [alt]="'Фото ' + cat().name"
            class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        } @else {
          <div
            class="w-full h-full flex flex-col items-center justify-center text-slate-400"
            aria-hidden="true"
          >
            <span class="text-sm mt-2">Нет фото</span>
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
          @if (cat()!.price && +cat()!.price! !== 0) {
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
export class CatCardComponent {
  readonly cat = input.required<CatRead>();

  readonly mainImage = computed(() => {
    const images = this.cat().images;
    if (!images.length) return null;
    return images.find((i) => i.is_main) ?? images[0];
  });

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

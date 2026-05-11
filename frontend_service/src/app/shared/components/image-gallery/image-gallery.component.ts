import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CatImage } from '../../../core/models/cat.model';

@Component({
  selector: 'app-image-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Main image -->
      <div
        class="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center relative"
      >
        @if (activeImage()) {
          <img
            [src]="activeImage()!.image_url"
            [alt]="'Основное фото'"
            class="w-full h-full object-cover"
          />
          @if (activeImage()!.is_main) {
            <span
              class="absolute top-2 left-2 bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full"
              aria-label="Главное фото"
            >
              Главное
            </span>
          }
        } @else {
          <div class="flex flex-col items-center text-slate-400" aria-hidden="true">
            <span class="text-6xl">🐱</span>
            <span class="text-sm mt-2">Нет фото</span>
          </div>
        }
      </div>

      <!-- Thumbnails -->
      @if (images().length > 1) {
        <div
          class="flex gap-2 overflow-x-auto pb-1"
          role="list"
          aria-label="Галерея фото"
        >
          @for (img of images(); track img.id) {
            <button
              type="button"
              class="shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors"
              [class]="activeId() === img.id ? 'border-violet-600' : 'border-transparent hover:border-slate-300'"
              (click)="activeId.set(img.id)"
              [attr.aria-label]="'Фото ' + ($index + 1)"
              [attr.aria-pressed]="activeId() === img.id"
            >
              <img
                [src]="img.image_url"
                [alt]="'Фото ' + ($index + 1)"
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          }
        </div>
      }

      <!-- Edit mode: upload + delete -->
      @if (editMode()) {
        <div class="flex flex-col gap-3 pt-2 border-t border-slate-100">
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium text-slate-700">Добавить фото</span>
            <input
              #fileInput
              type="file"
              accept="image/*"
              multiple
              class="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
              aria-label="Выберите фото для загрузки"
              (change)="onFileChange(fileInput.files)"
            />
          </label>

          @if (activeImage() && images().length > 0) {
            <p-button
              label="Удалить фото"
              icon="pi pi-trash"
              severity="danger"
              size="small"
              [outlined]="true"
              (onClick)="deleteImage.emit(activeImage()!.id)"
              aria-label="Удалить текущее фото"
            />
          }
        </div>
      }
    </div>
  `,
})
export class ImageGalleryComponent {
  readonly images = input.required<CatImage[]>();
  readonly editMode = input(false);

  readonly uploadImages = output<File[]>();
  readonly deleteImage = output<number>();

  readonly activeId = signal<number | null>(null);

  readonly activeImage = computed(() => {
    const imgs = this.images();
    if (!imgs.length) return null;
    const id = this.activeId();
    return imgs.find((i) => i.id === id) ?? imgs.find((i) => i.is_main) ?? imgs[0];
  });

  onFileChange(files: FileList | null): void {
    if (!files?.length) return;
    this.uploadImages.emit(Array.from(files));
  }
}

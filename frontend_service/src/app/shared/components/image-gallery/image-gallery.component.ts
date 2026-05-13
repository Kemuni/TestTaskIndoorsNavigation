import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { CatImage } from '../../../core/models/cat.model';

@Component({
  selector: 'app-image-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, CheckboxModule, FormsModule],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Main image with carousel arrows -->
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
              class="absolute top-2 left-2 bg-gray-900 text-white text-xs px-2 py-0.5 rounded-full"
              aria-label="Главное фото"
            >
              Главное
            </span>
          }
          @if (images().length > 1) {
            <button
              type="button"
              class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              (click)="prevImage()"
              aria-label="Предыдущее фото"
            >
              <i class="pi pi-angle-left"></i>
            </button>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              (click)="nextImage()"
              aria-label="Следующее фото"
            >
              <i class="pi pi-angle-right"></i>
            </button>
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
          @for (img of images(); track img.id; let i = $index) {
            <button
              type="button"
              class="shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors"
              [class]="activeIndex() === i ? 'border-gray-900' : 'border-transparent hover:border-slate-300'"
              (click)="goTo(i)"
              [attr.aria-label]="'Фото ' + (i + 1)"
              [attr.aria-pressed]="activeIndex() === i"
            >
              <img
                [src]="img.image_url"
                [alt]="'Фото ' + (i + 1)"
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          }
        </div>
      }

      <!-- Edit mode: upload + isMain checkbox + delete -->
      @if (editMode()) {
        <div class="flex flex-col gap-3 pt-2 border-t border-slate-100">
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium text-slate-700">Добавить фото</span>
            <input
              #fileInput
              type="file"
              accept="image/*"
              multiple
              class="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
              aria-label="Выберите фото для загрузки"
              (change)="onFileChange(fileInput.files)"
            />
          </label>

          <div class="flex items-center gap-2">
            <p-checkbox
              [binary]="true"
              [(ngModel)]="isMainChecked"
              inputId="isMainCheck"
            />
            <label for="isMainCheck" class="text-sm text-slate-700 cursor-pointer">
              Добавляемое фото является главным
            </label>
          </div>

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
export class ImageGalleryComponent implements OnInit, OnDestroy {
  readonly images = input.required<CatImage[]>();
  readonly editMode = input(false);

  readonly uploadImages = output<{ files: File[]; isMain: boolean }>();
  readonly deleteImage = output<number>();

  readonly activeIndex = signal(0);
  isMainChecked = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly activeImage = computed(() => {
    const imgs = this.images();
    if (!imgs.length) return null;
    return imgs[this.activeIndex()] ?? null;
  });

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private startTimer(): void {
    this.stopTimer();
    // if (this.images().length > 1) {
      // this.intervalId = setInterval(() => {
      //   this.activeIndex.update((i) => (i + 1) % this.images().length);
      // }, 4000);
    // }
  }

  private stopTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  goTo(index: number): void {
    this.activeIndex.set(index);
    this.startTimer();
  }

  prevImage(): void {
    const len = this.images().length;
    this.activeIndex.update((i) => (i - 1 + len) % len);
    this.startTimer();
  }

  nextImage(): void {
    const len = this.images().length;
    this.activeIndex.update((i) => (i + 1) % len);
    this.startTimer();
  }

  onFileChange(files: FileList | null): void {
    if (!files?.length) return;
    this.uploadImages.emit({ files: Array.from(files), isMain: this.isMainChecked });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ImageGalleryComponent } from '../../../shared/components/image-gallery/image-gallery.component';
import { CatsService } from '../../../core/services/cats.service';
import { AuthService } from '../../../core/services/auth.service';
import { CatRead, GENDER_LABELS, STATUS_LABELS, STATUS_SEVERITY } from '../../../core/models/cat.model';
import { HAIR_TYPE_LABELS } from '../../../core/models/breed.model';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-cat-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageGalleryComponent,
    TagModule,
    ButtonModule,
    SkeletonModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './cat-detail.component.html',
})
export class CatDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catsService = inject(CatsService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly cat = signal<CatRead | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly uploadLoading = signal(false);

  readonly hairTypeLabels = HAIR_TYPE_LABELS;

  readonly isOwner = computed(() => {
    const user = this.authService.currentUser();
    const cat = this.cat();
    return !!(user && cat && user.id === cat.owner.id);
  });

  readonly statusLabel = computed(() => {
    const cat = this.cat();
    return cat ? STATUS_LABELS[cat.status] : '';
  });

  readonly statusSeverity = computed(() => {
    const cat = this.cat();
    return (cat ? STATUS_SEVERITY[cat.status] : 'info') as 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
  });

  readonly genderLabel = computed(() => {
    const cat = this.cat();
    return cat ? GENDER_LABELS[cat.gender] : '';
  });

  readonly ageLabel = computed(() => {
    const cat = this.cat();
    if (!cat) return '';
    const months = cat.age_months;
    if (months < 12) return `${months} мес.`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem ? `${years} г. ${rem} мес.` : `${years} г.`;
  });

  formatBirthday(dateStr: string): string {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
  }

  private get catId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.catsService.getCat(this.catId).subscribe({
      next: (res) => {
        this.cat.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  onUploadImages(files: File[]): void {
    this.uploadLoading.set(true);
    let completed = 0;
    for (const file of files) {
      this.catsService.uploadImage(this.catId, file).subscribe({
        next: () => {
          completed++;
          if (completed === files.length) {
            this.uploadLoading.set(false);
            this.reload();
          }
        },
        error: () => {
          completed++;
          if (completed === files.length) this.uploadLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить фото' });
        },
      });
    }
  }

  onDeleteImage(imageId: number): void {
    this.confirmationService.confirm({
      message: 'Удалить это фото?',
      header: 'Подтверждение',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Удалить',
      rejectLabel: 'Отмена',
      accept: () => {
        this.catsService.deleteImage(this.catId, imageId).subscribe({
          next: () => {
            this.cat.update((c) =>
              c ? { ...c, images: c.images.filter((i) => i.id !== imageId) } : c,
            );
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось удалить фото' });
          },
        });
      },
    });
  }

  onDelete(): void {
    this.confirmationService.confirm({
      message: 'Вы уверены, что хотите удалить это объявление? Действие необратимо.',
      header: 'Удаление объявления',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Удалить',
      rejectLabel: 'Отмена',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.catsService.deleteCat(this.catId).subscribe({
          next: () => this.router.navigate(['/cats']),
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось удалить объявление' });
          },
        });
      },
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.ngOnInit();
  }
}

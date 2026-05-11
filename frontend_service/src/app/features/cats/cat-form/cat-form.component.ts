import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatsService } from '../../../core/services/cats.service';
import { BreedsService } from '../../../core/services/breeds.service';
import { Breed } from '../../../core/models/breed.model';
import { CatRead, CatWrite, GenderEnum, StatusEnum, GENDER_LABELS, STATUS_LABELS } from '../../../core/models/cat.model';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ImageGalleryComponent } from '../../../shared/components/image-gallery/image-gallery.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

interface SelectOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-cat-form',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    TextareaModule,
    MessageModule,
    ImageGalleryComponent,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './cat-form.component.html',
})
export class CatFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catsService = inject(CatsService);
  private readonly breedsService = inject(BreedsService);
  private readonly messageService = inject(MessageService);

  readonly isEdit = computed(() => !!this.route.snapshot.paramMap.get('id'));
  readonly editId = computed(() => Number(this.route.snapshot.paramMap.get('id')));

  readonly loading = signal(false);
  readonly dataLoading = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly savedCat = signal<CatRead | null>(null);
  readonly breeds = signal<Breed[]>([]);

  readonly breedOptions = computed<SelectOption<number>[]>(() =>
    this.breeds().map((b) => ({ label: b.name, value: b.id })),
  );

  readonly genderOptions: SelectOption<GenderEnum>[] = [
    { label: GENDER_LABELS['M'], value: 'M' },
    { label: GENDER_LABELS['F'], value: 'F' },
  ];

  readonly statusOptions: SelectOption<StatusEnum>[] = (
    ['FOR_DEMONSTRATION', 'AWAITING_OWNER', 'GIVEN_AWAY', 'CLOSED'] as StatusEnum[]
  ).map((s) => ({ label: STATUS_LABELS[s], value: s }));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    birthday: ['', Validators.required],
    gender: ['M' as GenderEnum, Validators.required],
    color: ['', [Validators.required, Validators.maxLength(100)]],
    breed_id: [null as unknown as number, Validators.required],
    current_weight: [null as unknown as number, Validators.required],
    birth_weight: [null as unknown as number, Validators.required],
    is_sterilized: [false],
    description: [null as string | null],
    mother_id: [null as number | null],
    father_id: [null as number | null],
    status: ['FOR_DEMONSTRATION' as StatusEnum, Validators.required],
    price: [null as string | null],
  });

  ngOnInit(): void {
    this.breedsService.getBreeds().subscribe((res) => this.breeds.set(res.data.results));

    if (this.isEdit()) {
      this.dataLoading.set(true);
      this.catsService.getCat(this.editId()).subscribe({
        next: (res) => {
          const cat = res.data;
          this.form.patchValue({
            name: cat.name,
            birthday: cat.birthday,
            gender: cat.gender,
            color: cat.color,
            breed_id: cat.breed.id,
            current_weight: cat.current_weight,
            birth_weight: cat.birth_weight,
            is_sterilized: cat.is_sterilized,
            description: cat.description,
            mother_id: cat.mother?.id ?? null,
            father_id: cat.father?.id ?? null,
            status: cat.status,
            price: cat.price,
          });
          this.dataLoading.set(false);
        },
        error: () => this.router.navigate(['/cats']),
      });
    }
  }

  fieldInvalid(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && ctrl.touched;
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue();
    const payload: CatWrite = {
      ...raw,
      price: raw.price || null,
      description: raw.description || null,
    };

    const request$ = this.isEdit()
      ? this.catsService.updateCat(this.editId(), payload)
      : this.catsService.createCat(payload);

    request$.subscribe({
      next: (res) => {
        this.savedCat.set(res.data);
        this.loading.set(false);
        if (!this.isEdit()) {
          this.messageService.add({ severity: 'success', summary: 'Готово', detail: 'Объявление создано! Теперь можно добавить фото.' });
        } else {
          this.router.navigate(['/cats', res.data.id]);
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const msg =
          (err as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'Ошибка при сохранении. Проверьте данные.';
        this.submitError.set(msg);
      },
    });
  }

  onUploadImages(files: File[]): void {
    const cat = this.savedCat();
    if (!cat) return;
    for (const file of files) {
      this.catsService.uploadImage(cat.id, file).subscribe({
        next: (res) => {
          this.savedCat.update((c) => (c ? { ...c, images: res.data } : c));
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить фото' });
        },
      });
    }
  }

  onDeleteImage(imageId: number): void {
    const cat = this.savedCat();
    if (!cat) return;
    this.catsService.deleteImage(cat.id, imageId).subscribe({
      next: () => {
        this.savedCat.update((c) =>
          c ? { ...c, images: c.images.filter((i) => i.id !== imageId) } : c,
        );
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось удалить фото' });
      },
    });
  }

  onFinish(): void {
    const cat = this.savedCat();
    if (cat) this.router.navigate(['/cats', cat.id]);
  }
}

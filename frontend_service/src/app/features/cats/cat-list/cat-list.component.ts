import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CatCardComponent } from '../../../shared/components/cat-card/cat-card.component';
import { CatsService } from '../../../core/services/cats.service';
import { BreedsService } from '../../../core/services/breeds.service';
import { CatFilters, CatRead, GenderEnum, StatusEnum, STATUS_LABELS, GENDER_LABELS } from '../../../core/models/cat.model';
import { Breed } from '../../../core/models/breed.model';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { DrawerModule } from 'primeng/drawer';

interface SelectOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-cat-list',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    ReactiveFormsModule,
    CatCardComponent,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    InputTextModule,
    CheckboxModule,
    PaginatorModule,
    SkeletonModule,
    DrawerModule,
  ],
  templateUrl: './cat-list.component.html',
})
export class CatListComponent implements OnInit {
  private readonly catsService = inject(CatsService);
  private readonly breedsService = inject(BreedsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly cats = signal<CatRead[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly breeds = signal<Breed[]>([]);
  readonly filtersVisible = signal(false);
  readonly pageSize = 12;

  readonly currentPage = signal(1);

  readonly breedOptions = computed<SelectOption<number | null>[]>(() => [
    { label: 'Все породы', value: null },
    ...this.breeds().map((b) => ({ label: b.name, value: b.id })),
  ]);

  readonly genderOptions: SelectOption<GenderEnum | null>[] = [
    { label: 'Любой пол', value: null },
    { label: GENDER_LABELS['M'], value: 'M' },
    { label: GENDER_LABELS['F'], value: 'F' },
  ];

  readonly statusOptions: SelectOption<StatusEnum | null>[] = [
    { label: 'Любой статус', value: null },
    ...(['FOR_DEMONSTRATION', 'AWAITING_OWNER', 'GIVEN_AWAY', 'CLOSED'] as StatusEnum[]).map(
      (s) => ({ label: STATUS_LABELS[s], value: s }),
    ),
  ];

  readonly filterForm = this.fb.group({
    search: [''],
    breed_id: [null as number | null],
    gender: [null as GenderEnum | null],
    status: [null as StatusEnum | null],
    min_age_months: [null as number | null],
    max_age_months: [null as number | null],
    price_min: [null as number | null],
    price_max: [null as number | null],
    is_free: [false],
    is_sterilized: [null as boolean | null],
  });

  ngOnInit(): void {
    this.breedsService.getBreeds().subscribe((res) => this.breeds.set(res.data.results));
    this.loadFromQueryParams();
    this.loadCats();
  }

  private loadFromQueryParams(): void {
    const p = this.route.snapshot.queryParams as Record<string, string>;
    this.filterForm.patchValue({
      search: p['search'] ?? '',
      breed_id: p['breed_id'] ? Number(p['breed_id']) : null,
      gender: (p['gender'] as GenderEnum) ?? null,
      status: (p['status'] as StatusEnum) ?? null,
      min_age_months: p['min_age_months'] ? Number(p['min_age_months']) : null,
      max_age_months: p['max_age_months'] ? Number(p['max_age_months']) : null,
      price_min: p['price_min'] ? Number(p['price_min']) : null,
      price_max: p['price_max'] ? Number(p['price_max']) : null,
      is_free: p['is_free'] === 'true',
    });
    if (p['page']) this.currentPage.set(Number(p['page']));
  }

  loadCats(): void {
    this.loading.set(true);
    const raw = this.filterForm.getRawValue();
    const filters: CatFilters = {
      page: this.currentPage(),
      page_size: this.pageSize,
    };

    if (raw.search) filters.search = raw.search;
    if (raw.breed_id) filters.breed_id = raw.breed_id;
    if (raw.gender) filters.gender = raw.gender;
    if (raw.status) filters.status = raw.status;
    if (raw.min_age_months != null) filters.min_age_months = raw.min_age_months;
    if (raw.max_age_months != null) filters.max_age_months = raw.max_age_months;
    if (raw.price_min != null) filters.price_min = raw.price_min;
    if (raw.price_max != null) filters.price_max = raw.price_max;
    if (raw.is_free) filters.is_free = true;

    this.syncQueryParams(filters);

    this.catsService.getCats(filters).subscribe({
      next: (res) => {
        this.cats.set(res.data.results);
        this.totalCount.set(res.data.count ?? res.data.results.length);
        this.loading.set(false);
        this.error.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private syncQueryParams(filters: CatFilters): void {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '' && value !== false && key !== 'page_size') {
        params[key] = String(value);
      }
    }
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  onApplyFilters(): void {
    this.currentPage.set(1);
    this.filtersVisible.set(false);
    this.loadCats();
  }

  onResetFilters(): void {
    this.filterForm.reset({ is_free: false });
    this.currentPage.set(1);
    this.loadCats();
  }

  onPageChange(event: PaginatorState): void {
    this.currentPage.set((event.page ?? 0) + 1);
    this.loadCats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

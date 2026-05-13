import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CatsService } from '../../../core/services/cats.service';
import { CatRead } from '../../../core/models/cat.model';
import { CatCardComponent } from '../../../shared/components/cat-card/cat-card.component';
import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-user-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CatCardComponent, SkeletonModule, AvatarModule],
  template: `
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Profile header -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8 flex items-center gap-6">
        <p-avatar
          [image]="firstCat()?.owner?.image_url ?? undefined"
          [label]="!firstCat()?.owner?.image_url ? initials() : undefined"
          shape="circle"
          size="xlarge"
          styleClass="bg-gray-100 text-gray-700 font-bold text-2xl w-20 h-20 shrink-0"
          aria-hidden="true"
        />
        <div>
          <h1 class="text-xl font-bold text-slate-900">
            @if (firstCat()) {
              {{ firstCat()!.owner.first_name }} {{ firstCat()!.owner.last_name }}
            } @else if (catsLoading()) {
              <span class="inline-block w-40 h-6 bg-slate-200 rounded animate-pulse"></span>
            } @else {
              Пользователь #{{ id() }}
            }
          </h1>
          <p class="text-slate-500 text-sm mt-0.5">Объявлений: {{ cats().length }}</p>
        </div>
      </div>

      <!-- Listings -->
      <h2 class="text-lg font-semibold text-slate-900 mb-4">Объявления</h2>

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
        <div class="text-center py-12 text-slate-400" role="alert">
          <div class="text-5xl mb-3" aria-hidden="true">⚠️</div>
          <p class="font-medium text-slate-600">Не удалось загрузить объявления</p>
          <p class="text-sm mt-1">Сервер недоступен — попробуйте позже</p>
        </div>
      } @else if (cats().length === 0) {
        <div class="text-center py-12 text-slate-400">
          <div class="text-5xl mb-3" aria-hidden="true">🐱</div>
          <p>У этого пользователя нет объявлений</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (cat of cats(); track cat.id) {
            <app-cat-card [cat]="cat" />
          }
        </div>
      }
    </main>
  `,
})
export class UserProfileComponent implements OnInit {
  private readonly catsService = inject(CatsService);

  readonly id = input.required<string>();

  readonly cats = signal<CatRead[]>([]);
  readonly catsLoading = signal(false);
  readonly catsError = signal(false);

  readonly firstCat = () => this.cats()[0] ?? null;

  readonly initials = () => {
    const cat = this.firstCat();
    if (!cat) return '?';
    return `${cat.owner.first_name[0] ?? ''}${cat.owner.last_name[0] ?? ''}`.toUpperCase();
  };

  ngOnInit(): void {
    this.catsLoading.set(true);
    this.catsService.getCats({ owner_id: Number(this.id()), page_size: 50 }).subscribe({
      next: (res) => {
        this.cats.set(res.data.results);
        this.catsLoading.set(false);
        this.catsError.set(false);
      },
      error: () => {
        this.catsLoading.set(false);
        this.catsError.set(true);
      },
    });
  }
}

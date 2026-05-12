import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavouritesService } from '../../core/services/favourites.service';
import { FavouriteCat } from '../../core/models/favourite.model';
import { CatCardComponent } from '../../shared/components/cat-card/cat-card.component';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-favourites',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CatCardComponent, ButtonModule, SkeletonModule],
  template: `
    <main class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-slate-900 mb-6">Избранное</h1>

      @if (loading()) {
        <div class="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="rounded-xl overflow-hidden shadow-sm border border-slate-100">
              <p-skeleton height="200px" />
              <div class="p-4 flex flex-col gap-2">
                <p-skeleton width="60%" height="20px" />
                <p-skeleton width="80%" height="16px" />
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="text-center py-16 text-slate-400">
          <div class="text-5xl mb-4" aria-hidden="true">⚠️</div>
          <p class="text-lg font-medium text-slate-600">Не удалось загрузить избранное</p>
          <button
            type="button"
            class="mt-4 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            (click)="load()"
          >
            Повторить
          </button>
        </div>
      } @else if (favourites().length === 0) {
        <div class="text-center py-16 text-slate-400">
          <div class="text-5xl mb-4" aria-hidden="true">🐱</div>
          <p class="text-lg font-medium text-slate-600">В избранном пусто</p>
          <p class="text-sm mt-1">Добавляйте понравившихся кошек с их страницы</p>
          <a
            routerLink="/cats"
            class="inline-block mt-4 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Посмотреть объявления
          </a>
        </div>
      } @else {
        <div class="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          @for (fav of favourites(); track fav.id) {
            <div class="relative">
              <app-cat-card [cat]="fav.cat" />
              <button
                type="button"
                class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-red-500 hover:text-red-600 transition-colors"
                (click)="remove(fav)"
                aria-label="Убрать из избранного"
              >
                <i class="pi pi-heart-fill text-sm" aria-hidden="true"></i>
              </button>
            </div>
          }
        </div>
      }
    </main>
  `,
})
export class FavouritesComponent implements OnInit {
  private readonly favouritesService = inject(FavouritesService);

  readonly favourites = signal<FavouriteCat[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.favouritesService.getFavourites().subscribe({
      next: (res) => {
        this.favourites.set(res.data.results);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  remove(fav: FavouriteCat): void {
    this.favouritesService.removeFavourite(fav.id).subscribe({
      next: () => {
        this.favourites.update((list) => list.filter((f) => f.id !== fav.id));
      },
      error: () => {},
    });
  }
}

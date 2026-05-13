import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogsService } from '../../../core/services/dialogs.service';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { ShortMessage } from '../../../core/models/dialog.model';
import { User } from '../../../core/models/user.model';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-direct-chat',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [RouterLink, ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule],
  template: `
    <main class="max-w-2xl mx-auto px-4 py-8 flex flex-col" style="height: calc(100vh - 4rem)">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <a routerLink="/cats" class="text-slate-400 hover:text-slate-600 transition-colors" aria-label="К объявлениям">
          <i class="pi pi-arrow-left text-lg" aria-hidden="true"></i>
        </a>
        @if (receiver()) {
          @if (receiver()!.image_url) {
            <img
              [src]="receiver()!.image_url"
              [alt]="receiver()!.first_name + ' ' + receiver()!.last_name"
              class="w-10 h-10 rounded-full object-cover shrink-0"
              aria-hidden="true"
            />
          } @else {
            <div
              class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm shrink-0"
              aria-hidden="true"
            >
              {{ receiver()!.first_name[0] }}{{ receiver()!.last_name[0] }}
            </div>
          }
          <h1 class="font-semibold text-slate-900">
            {{ receiver()!.first_name }} {{ receiver()!.last_name }}
          </h1>
        } @else if (loading()) {
          <p-skeleton width="150px" height="20px" />
        }
      </div>

      <!-- Messages -->
      <div
        #messagesContainer
        class="flex-1 overflow-y-auto flex flex-col gap-3 py-2"
        role="log"
        aria-live="polite"
        aria-label="Сообщения"
      >
        <!-- Load more indicator at top -->
        @if (loadingMore()) {
          <div class="flex justify-center py-2" aria-label="Загрузка старых сообщений">
            <i class="pi pi-spin pi-spinner text-slate-400" aria-hidden="true"></i>
          </div>
        }

        @if (loading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="flex gap-2" [class]="i % 2 === 0 ? 'flex-row-reverse' : ''">
              <p-skeleton shape="circle" size="2rem" />
              <p-skeleton width="200px" height="40px" styleClass="rounded-2xl" />
            </div>
          }
        } @else if (messages().length === 0) {
          <div class="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Начните переписку — напишите первое сообщение
          </div>
        } @else {
          @for (msg of messages(); track msg.id) {
            <div
              class="flex items-end gap-2 max-w-[80%]"
              [class]="isOwn(msg) ? 'self-end flex-row-reverse' : 'self-start'"
            >
              <div
                class="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                [class]="isOwn(msg)
                  ? 'bg-gray-900 text-white rounded-br-none'
                  : 'bg-white border border-slate-100 text-slate-900 rounded-bl-none shadow-sm'"
              >
                <p class="m-0">{{ msg.content }}</p>
                <time
                  class="block text-xs mt-1 opacity-70 flex items-center gap-1"
                  [attr.datetime]="msg.created_at"
                >
                  {{ formatTime(msg.created_at) }}
                  @if (isOwn(msg)) {
                    @if (msg._pending) {
                      <i class="pi pi-spin pi-spinner text-xs opacity-70 ml-1" aria-label="Отправляется"></i>
                    } @else if (msg.read_at) {
                      <span class="ml-1 -tracking-[0.5em]" aria-label="Прочитано">✓✓</span>
                    } @else {
                      <span class="ml-1" aria-label="Доставлено">✓</span>
                    }
                  }
                </time>
              </div>
            </div>
          }
        }
      </div>

      <!-- Input -->
      <form
        [formGroup]="messageForm"
        (ngSubmit)="sendMessage()"
        class="mt-4 pt-4 border-t border-slate-100 flex gap-2"
        aria-label="Написать сообщение"
      >
        <input
          pInputText
          type="text"
          formControlName="content"
          placeholder="Написать сообщение..."
          class="flex-1"
          aria-label="Текст сообщения"
          (keydown.enter)="$event.preventDefault(); sendMessage()"
        />
        <p-button
          type="submit"
          icon="pi pi-send"
          [disabled]="messageForm.invalid"
          aria-label="Отправить сообщение"
        />
      </form>
    </main>
  `,
})
export class DirectChatComponent implements OnInit, AfterViewInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  private readonly dialogsService = inject(DialogsService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly fb = inject(FormBuilder);

  readonly userId = input.required<string>();

  readonly messages = signal<ShortMessage[]>([]);
  readonly receiver = signal<User | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(false);

  private dialogId: number | null = null;
  private nextPageUrl: string | null = null;
  private wsSub?: Subscription;
  private scrollListener?: EventListener;
  private shouldScrollBottom = false;

  readonly messageForm = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  private get receiverUserId(): number {
    return Number(this.userId());
  }

  private get currentUserId(): number | undefined {
    return this.authService.currentUser()?.id;
  }

  ngOnInit(): void {
    this.usersService.getProfile(this.receiverUserId).subscribe({
      next: (res) => this.receiver.set(res.data),
      error: () => {},
    });

    this.dialogsService.getDialogs().subscribe({
      next: (res) => {
        const existing = res.data.results.find(
          (d) => d.with_user.id === this.receiverUserId,
        );
        if (existing) {
          this.dialogId = existing.id;
          this.loadInitialMessages(existing.id);
        } else {
          this.loading.set(false);
          this.connectWebSocket();
        }
      },
      error: () => {
        this.loading.set(false);
        this.connectWebSocket();
      },
    });
  }

  ngAfterViewInit(): void {
    this.attachScrollListener();
  }

  private attachScrollListener(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    this.scrollListener = () => {
      if (el.scrollTop < 80 && this.hasMore() && !this.loadingMore()) {
        this.loadMoreMessages();
      }
    };
    el.addEventListener('scroll', this.scrollListener);
  }

  private loadInitialMessages(dialogId: number): void {
    this.dialogsService.getMessages(dialogId).subscribe({
      next: (res) => {
        // API returns newest-first — reverse so oldest is at top
        this.messages.set([...res.data.results].reverse());
        this.nextPageUrl = res.data.next ?? null;
        this.hasMore.set(!!res.data.next);
        this.shouldScrollBottom = true;
      },
      error: () => {},
      complete: () => {
        this.loading.set(false);
        this.connectWebSocket();
        this.markUnreadMessages();
      },
    });
  }

  private loadMoreMessages(): void {
    if (!this.nextPageUrl || this.loadingMore()) return;
    this.loadingMore.set(true);

    const el = this.messagesContainer?.nativeElement;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    this.dialogsService.getMessagesFromUrl(this.nextPageUrl).subscribe({
      next: (res) => {
        const older = [...res.data.results].reverse();
        this.messages.update((msgs) => [...older, ...msgs]);
        this.nextPageUrl = res.data.next ?? null;
        this.hasMore.set(!!res.data.next);
        // Restore scroll so the user stays at the same spot
        if (el) {
          requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight - prevScrollHeight;
          });
        }
      },
      error: () => {},
      complete: () => this.loadingMore.set(false),
    });
  }

  private markUnreadMessages(): void {
    const uid = this.currentUserId;
    const unreadIds = this.messages()
      .filter((m) => m.sender_id !== uid && m.read_at === null)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      this.chatService.readMessages(unreadIds);
    }
  }

  private connectWebSocket(): void {
    this.chatService.connectToUser(this.receiverUserId);
    this.wsSub = this.chatService.messages$.subscribe((wsMsg) => {
      if (wsMsg.type === 'message' && wsMsg.id != null && wsMsg.content) {
        const uid = this.currentUserId;
        const pendingIdx = this.messages().findIndex(
          (m) => m._pending && m.content === wsMsg.content && m.sender_id === uid,
        );
        const confirmed: ShortMessage = {
          id: wsMsg.id,
          content: wsMsg.content,
          created_at: wsMsg.created_at ?? new Date().toISOString(),
          sender_id: wsMsg.sender_id ?? 0,
          read_at: wsMsg.read_at ?? null,
        };
        if (pendingIdx !== -1) {
          this.messages.update((msgs) => {
            const updated = [...msgs];
            updated[pendingIdx] = confirmed;
            return updated;
          });
        } else {
          this.messages.update((msgs) => [...msgs, confirmed]);
        }
        this.shouldScrollBottom = true;
        // this.markUnreadMessages();
      } else if (wsMsg.type === 'delete_messages' && wsMsg.message_ids?.length) {
        this.messages.update((msgs) =>
          msgs.filter((m) => !wsMsg.message_ids!.includes(m.id)),
        );
      } else if (wsMsg.type === 'read_messages' && wsMsg.message_ids?.length) {
        const now = new Date().toISOString();
        this.messages.update((msgs) =>
          msgs.map((m) =>
            wsMsg.message_ids!.includes(m.id) ? { ...m, read_at: now } : m,
          ),
        );
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  ngOnDestroy(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el && this.scrollListener) {
      el.removeEventListener('scroll', this.scrollListener);
    }
    this.wsSub?.unsubscribe();
    this.chatService.disconnect();
  }

  isOwn(msg: ShortMessage): boolean {
    return msg.sender_id === this.currentUserId;
  }

  sendMessage(): void {
    const content = this.messageForm.controls.content.value.trim();
    if (!content || this.messageForm.invalid) return;

    const uid = this.currentUserId ?? 0;
    const pending: ShortMessage = {
      id: -Date.now(),
      content,
      created_at: new Date().toISOString(),
      sender_id: uid,
      read_at: null,
      _pending: true,
    };
    this.messages.update((msgs) => [...msgs, pending]);
    this.chatService.send(content);
    this.messageForm.reset();
    this.shouldScrollBottom = true;
  }

  formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('ru', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}

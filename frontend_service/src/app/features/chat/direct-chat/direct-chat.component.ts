import {
  AfterViewChecked,
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
import { Subscription, switchMap } from 'rxjs';
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
          <div
            class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm shrink-0"
            aria-hidden="true"
          >
            {{ receiver()!.first_name[0] }}{{ receiver()!.last_name[0] }}
          </div>
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
                  class="block text-xs mt-1 opacity-70"
                  [attr.datetime]="msg.created_at"
                >
                  {{ formatTime(msg.created_at) }}
                  @if (isOwn(msg) && msg.read_at) {
                    <span class="ml-1" aria-label="Прочитано">✓✓</span>
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
export class DirectChatComponent implements OnInit, OnDestroy, AfterViewChecked {
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

  private wsSub?: Subscription;
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
    // Load receiver profile
    this.usersService.getProfile(this.receiverUserId).subscribe({
      next: (res) => this.receiver.set(res.data),
      error: () => { /* non-critical */ },
    });

    // Try to find existing dialog and preload messages
    this.dialogsService.getDialogs().subscribe({
      next: (res) => {
        const existing = res.data.results.find(
          (d) => d.with_user.id === this.receiverUserId,
        );
        if (existing) {
          this.dialogsService.getDialog(existing.id).subscribe({
            next: (dialogRes) => {
              this.messages.set([...dialogRes.data.recent_messages].reverse());
              this.shouldScrollBottom = true;
            },
            error: () => { /* proceed without history */ },
            complete: () => {
              this.loading.set(false);
              this.connectWebSocket();
            },
          });
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

  private connectWebSocket(): void {
    this.chatService.connectToUser(this.receiverUserId);
    this.wsSub = this.chatService.messages$.subscribe((wsMsg) => {
      if (wsMsg.type === 'message' && wsMsg.id && wsMsg.content) {
        const msg: ShortMessage = {
          id: wsMsg.id,
          content: wsMsg.content,
          created_at: wsMsg.created_at ?? new Date().toISOString(),
          sender_id: wsMsg.sender_id ?? 0,
          read_at: wsMsg.read_at ?? null,
        };
        this.messages.update((msgs) => [...msgs, msg]);
        this.shouldScrollBottom = true;
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
    this.wsSub?.unsubscribe();
    this.chatService.disconnect();
  }

  isOwn(msg: ShortMessage): boolean {
    return msg.sender_id === this.currentUserId;
  }

  sendMessage(): void {
    const content = this.messageForm.controls.content.value.trim();
    if (!content || this.messageForm.invalid) return;

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

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
import { ShortMessage, DialogUser } from '../../../core/models/dialog.model';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-dialog-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule],
  template: `
    <main class="max-w-2xl mx-auto px-4 py-8 flex flex-col" style="height: calc(100vh - 4rem)">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <a routerLink="/dialogs" class="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Назад к диалогам">
          <i class="pi pi-arrow-left text-lg" aria-hidden="true"></i>
        </a>
        @if (otherUser()) {
          <div
            class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm shrink-0"
            aria-hidden="true"
          >
            {{ otherUser()!.first_name[0] }}{{ otherUser()!.last_name[0] }}
          </div>
          <h1 class="font-semibold text-slate-900">
            {{ otherUser()!.first_name }} {{ otherUser()!.last_name }}
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
        aria-label="Сообщения диалога"
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
export class DialogDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  private readonly dialogsService = inject(DialogsService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly id = input.required<string>();

  readonly messages = signal<ShortMessage[]>([]);
  readonly otherUser = signal<DialogUser | null>(null);
  readonly loading = signal(true);

  private wsSub?: Subscription;
  private shouldScrollBottom = false;

  readonly messageForm = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  private get dialogId(): number {
    return Number(this.id());
  }

  private get currentUserId(): number | undefined {
    return this.authService.currentUser()?.id;
  }

  ngOnInit(): void {
    this.dialogsService.getDialog(this.dialogId).subscribe({
      next: (res) => {
        this.otherUser.set(res.data.with_user);
        this.messages.set(res.data.recent_messages);
        this.loading.set(false);
        this.shouldScrollBottom = true;
      },
      error: () => this.loading.set(false),
    });

    this.chatService.connect(this.dialogId);
    this.wsSub = this.chatService.messages$.subscribe((wsMsg) => {
      if (wsMsg.type === 'message' && wsMsg.id && wsMsg.content && wsMsg.sender_id) {
        const newMsg: ShortMessage = {
          id: wsMsg.id,
          content: wsMsg.content,
          sender_id: wsMsg.sender_id,
          created_at: wsMsg.created_at ?? new Date().toISOString(),
          read_at: wsMsg.read_at ?? null,
        };
        this.messages.update((prev) => [...prev, newMsg]);
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
    if (this.messageForm.invalid) return;
    const { content } = this.messageForm.getRawValue();
    this.chatService.sendToDialog(content);
    this.messageForm.reset();
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

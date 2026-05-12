import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { WsMessage, WsRawFrame } from '../models/dialog.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);

  private ws: WebSocket | null = null;
  private readonly messageSubject = new Subject<WsMessage>();
  private pendingMessages: string[] = [];

  readonly messages$ = this.messageSubject.asObservable();

  private attachHandlers(): void {
    if (!this.ws) return;
    this.ws.onopen = () => {
      for (const msg of this.pendingMessages) {
        this.ws!.send(msg);
      }
      this.pendingMessages = [];
    };
    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data as string) as WsRawFrame;
        const normalized = this.normalize(raw);
        if (normalized) this.messageSubject.next(normalized);
      } catch {
        // ignore malformed messages
      }
    };
    this.ws.onerror = () => {
      this.messageSubject.next({ type: 'error', message: 'WebSocket connection error' });
    };
  }

  private normalize(raw: WsRawFrame): WsMessage | null {
    // Format: { success: true, message: { id, sender_id, content, created_at? } }
    if (raw.success && raw.message) {
      return {
        type: 'message',
        id: raw.message.id,
        sender_id: raw.message.sender_id,
        content: raw.message.content,
        created_at: raw.message.created_at ?? new Date().toISOString(),
        read_at: null,
      };
    }
    // Legacy flat format: { type: 'message', id, sender_id, content, ... }
    if (raw.type === 'message') {
      return raw as unknown as WsMessage;
    }
    return null;
  }

  private enqueueOrSend(payload: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.pendingMessages.push(payload);
    }
  }

  connect(dialogId: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.disconnect();
    this.pendingMessages = [];

    const token = this.authService.getAccessToken();
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws/dialog/${dialogId}/${token ? `?token=${token}` : ''}`;

    this.ws = new WebSocket(url);
    this.attachHandlers();
  }

  connectToUser(receiverUserId: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.disconnect();
    this.pendingMessages = [];

    const token = this.authService.getAccessToken();
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws/chat/${receiverUserId}/${token ? `?token=${token}` : ''}`;

    this.ws = new WebSocket(url);
    this.attachHandlers();
  }

  /** For ws/dialog/{id}/ connections */
  sendToDialog(content: string): void {
    this.enqueueOrSend(JSON.stringify({ type: 'message', content }));
  }

  /** For ws/chat/{userId}/ connections */
  send(message: string): void {
    this.enqueueOrSend(JSON.stringify({ type: 'send_message', message }));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingMessages = [];
  }
}

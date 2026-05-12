export interface DialogUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface LastMessage {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  sender_first_name: string;
  sender_last_name: string;
}

export interface ShortMessage {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read_at: string | null;
}

export interface DialogSummary {
  id: number;
  with_user: DialogUser;
  last_message: LastMessage;
  unread_count: number;
}

export interface DialogWithMessages {
  id: number;
  with_user: DialogUser;
  recent_messages: ShortMessage[];
}

export interface WsMessage {
  type: 'message' | 'read' | 'error';
  id?: number;
  content?: string;
  sender_id?: number;
  created_at?: string;
  read_at?: string | null;
  message?: string;
}

/** Raw frame sent by the server for new messages */
export interface WsRawFrame {
  success?: boolean;
  message?: {
    id: number;
    sender_id: number;
    content: string;
    created_at?: string;
  };
  type?: string;
}

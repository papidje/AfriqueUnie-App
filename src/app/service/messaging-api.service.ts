import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';

export interface MessagingUserSummary {
  id: number;
  fullname: string;
  email: string | null;
  roleLabel: string;
}

export interface MessagingConversation {
  id: number;
  counterpart: MessagingUserSummary;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessagingMessage {
  id: number;
  conversationId: number;
  senderId: number;
  body: string;
  createdAt: string;
  mine: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessagingApiService {
  private readonly apiUrl = API_BASE_URL;
  private readonly unreadBump = new Subject<void>();
  readonly unreadBump$ = this.unreadBump.asObservable();

  constructor(private readonly http: HttpClient) {}

  bumpUnreadListeners(): void {
    this.unreadBump.next();
  }

  unreadSummary(): Observable<number> {
    return this.http
      .get<{ conversationCount: number }>(`${this.apiUrl}/messaging/unread-summary`)
      .pipe(map((r) => (typeof r?.conversationCount === 'number' ? r.conversationCount : 0)));
  }

  listConversations(q?: string): Observable<MessagingConversation[]> {
    let params = new HttpParams();
    if (q?.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<MessagingConversation[]>(`${this.apiUrl}/messaging/conversations`, {
      params
    });
  }

  listContacts(q?: string): Observable<MessagingUserSummary[]> {
    let params = new HttpParams();
    if (q?.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<MessagingUserSummary[]>(`${this.apiUrl}/messaging/contacts`, { params });
  }

  getOrCreateWith(userId: number): Observable<MessagingConversation> {
    return this.http.post<MessagingConversation>(
      `${this.apiUrl}/messaging/conversations/with/${userId}`,
      {}
    );
  }

  listMessages(
    conversationId: number,
    opts?: { afterId?: number; beforeId?: number; limit?: number }
  ): Observable<MessagingMessage[]> {
    let params = new HttpParams();
    if (opts?.afterId != null) {
      params = params.set('afterId', String(opts.afterId));
    }
    if (opts?.beforeId != null) {
      params = params.set('beforeId', String(opts.beforeId));
    }
    if (opts?.limit != null) {
      params = params.set('limit', String(opts.limit));
    }
    return this.http.get<MessagingMessage[]>(
      `${this.apiUrl}/messaging/conversations/${conversationId}/messages`,
      { params }
    );
  }

  sendMessage(conversationId: number, body: string): Observable<MessagingMessage> {
    return this.http.post<MessagingMessage>(
      `${this.apiUrl}/messaging/conversations/${conversationId}/messages`,
      { body }
    );
  }

  markRead(conversationId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/messaging/conversations/${conversationId}/read`, {});
  }
}

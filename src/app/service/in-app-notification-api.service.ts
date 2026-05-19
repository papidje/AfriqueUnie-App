import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';

export interface NotificationVm {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  linkId: number | null;
  read: boolean;
  processed: boolean;
  /** Dernière mise à jour de l’état (lu / traité / fermé), ISO */
  updatedAt: string | null;
  visible: boolean;
  closureReason?: string | null;
  schoolName: string | null;
}

/**
 * Centre de notifications in-app + acceptation / refus d’invitation multi-tenant.
 */
@Injectable({ providedIn: 'root' })
export class InAppNotificationApiService {
  private readonly apiUrl = API_BASE_URL;
  private readonly unreadBump = new Subject<void>();
  readonly unreadBump$ = this.unreadBump.asObservable();

  constructor(private readonly http: HttpClient) {}

  bumpUnreadListeners(): void {
    this.unreadBump.next();
  }

  getUnreadCount(): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.apiUrl}/notifications/unread-count`)
      .pipe(map((r) => (typeof r?.count === 'number' ? r.count : 0)));
  }

  listNotifications(unreadOnly = false): Observable<NotificationVm[]> {
    const q = unreadOnly ? '?unreadOnly=true' : '';
    return this.http.get<NotificationVm[]>(`${this.apiUrl}/notifications${q}`);
  }

  dismissNotification(notificationId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/notifications/${notificationId}/dismiss`, {});
  }

  markAllRead(): Observable<{ markedCount: number }> {
    return this.http.post<{ markedCount: number }>(`${this.apiUrl}/notifications/mark-all-read`, {});
  }

  acceptInvitationAffiliation(affiliationId: number): Observable<{ bearer: string; refresh: string }> {
    return this.http.post<{ bearer: string; refresh: string }>(
      `${this.apiUrl}/users/affiliations/${affiliationId}/accept`,
      {}
    );
  }

  refuseInvitationAffiliation(affiliationId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/users/affiliations/${affiliationId}/refuse`, {});
  }
}

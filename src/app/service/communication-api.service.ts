import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface CommunicationBatchSettings {
  evaluationReminderDaysBefore: number;
  evaluationReminderEnabled: boolean;
  paymentReminderEnabled: boolean;
  timetableChangeEnabled: boolean;
  batchChunkSize: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface CommunicationBatchSettingsUpdate {
  evaluationReminderDaysBefore?: number | null;
  evaluationReminderEnabled?: boolean | null;
  paymentReminderEnabled?: boolean | null;
  timetableChangeEnabled?: boolean | null;
  batchChunkSize?: number | null;
  emailEnabled?: boolean | null;
  smsEnabled?: boolean | null;
}

export interface CommunicationScheduledPreviewRow {
  kind: string;
  label: string;
  estimatedNotifications: number;
  detail: string;
}

export interface CommunicationManualSendRequest {
  schoolId: number;
  title: string;
  message: string;
  channel?: string | null;
  /** Vide ou absent : tous les élèves de l’année active de l’établissement. */
  schoolClassIds?: number[] | null;
}

export interface CommunicationManualSendResponse {
  attempted: number;
  successes: number;
  failures: number;
  skippedDuplicates: number;
}

export interface CommunicationHistoryRow {
  id: number;
  createdAt: string;
  source: string;
  eventType: string;
  status: string;
  channel: string;
  title: string | null;
  recipientsSummary: string | null;
  bodyPreview: string | null;
  bodyContent: string | null;
  errorMessage: string | null;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class CommunicationApiService {
  /** Aligné sur le backend {@code @RequestMapping("/api/communication")} et sur {@link FinanceApiService}. */
  private readonly base = `${API_BASE_URL}/api/communication`;

  constructor(private readonly http: HttpClient) {}

  getSettings(): Observable<CommunicationBatchSettings> {
    return this.http.get<CommunicationBatchSettings>(`${this.base}/settings`);
  }

  updateSettings(body: CommunicationBatchSettingsUpdate): Observable<CommunicationBatchSettings> {
    return this.http.put<CommunicationBatchSettings>(`${this.base}/settings`, body);
  }

  getScheduledPreview(schoolId: number): Observable<CommunicationScheduledPreviewRow[]> {
    const params = new HttpParams().set('schoolId', String(schoolId));
    return this.http.get<CommunicationScheduledPreviewRow[]>(`${this.base}/scheduled-preview`, { params });
  }

  getHistory(schoolId: number, page: number, size: number): Observable<SpringPage<CommunicationHistoryRow>> {
    const params = new HttpParams()
      .set('schoolId', String(schoolId))
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<SpringPage<CommunicationHistoryRow>>(`${this.base}/history`, { params });
  }

  manualSend(body: CommunicationManualSendRequest): Observable<CommunicationManualSendResponse> {
    return this.http.post<CommunicationManualSendResponse>(`${this.base}/manual-send`, body);
  }
}

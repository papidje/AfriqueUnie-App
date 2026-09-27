import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import {
  CreateSubjectAdditionRequestPayload,
  SubjectAdditionRequestComment,
  SubjectAdditionRequestDetail,
  SubjectAdditionRequestSummary
} from '../models/subject-addition-request.models';

@Injectable({ providedIn: 'root' })
export class SubjectAdditionRequestService {
  private readonly base = `${API_BASE_URL}/api/subject-addition-requests`;

  constructor(private readonly http: HttpClient) {}

  create(schoolId: number, body: CreateSubjectAdditionRequestPayload): Observable<SubjectAdditionRequestDetail> {
    const params = new HttpParams().set('schoolId', String(schoolId));
    return this.http.post<SubjectAdditionRequestDetail>(this.base, body, { params });
  }

  listMine(status: 'ALL' | 'OPEN' | 'CLOSED' = 'ALL'): Observable<SubjectAdditionRequestSummary[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<SubjectAdditionRequestSummary[]>(this.base, { params });
  }

  get(id: number): Observable<SubjectAdditionRequestDetail> {
    return this.http.get<SubjectAdditionRequestDetail>(`${this.base}/${id}`);
  }

  addComment(id: number, body: string): Observable<SubjectAdditionRequestComment> {
    return this.http.post<SubjectAdditionRequestComment>(`${this.base}/${id}/comments`, { body });
  }
}

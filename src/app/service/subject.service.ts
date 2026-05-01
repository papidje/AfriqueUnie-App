import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { SchoolSubject } from '../models/subject.models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly base = `${API_BASE_URL}/api/subjects`;

  constructor(private readonly http: HttpClient) {}

  private schoolParams(schoolId: number): HttpParams {
    return new HttpParams().set('schoolId', String(schoolId));
  }

  list(schoolId: number): Observable<SchoolSubject[]> {
    return this.http.get<SchoolSubject[]>(this.base, { params: this.schoolParams(schoolId) });
  }

  getById(schoolId: number, id: number): Observable<SchoolSubject> {
    return this.http.get<SchoolSubject>(`${this.base}/${id}`, { params: this.schoolParams(schoolId) });
  }

  create(schoolId: number, body: Pick<SchoolSubject, 'code' | 'name'>): Observable<SchoolSubject> {
    return this.http.post<SchoolSubject>(this.base, body, { params: this.schoolParams(schoolId) });
  }

  update(
    schoolId: number,
    id: number,
    body: Pick<SchoolSubject, 'code' | 'name'>
  ): Observable<SchoolSubject> {
    return this.http.put<SchoolSubject>(`${this.base}/${id}`, body, { params: this.schoolParams(schoolId) });
  }

  delete(schoolId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`, { params: this.schoolParams(schoolId) });
  }
}

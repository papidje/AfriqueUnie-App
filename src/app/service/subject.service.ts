import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { SchoolSubject } from '../models/subject.models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly base = `${API_BASE_URL}/api/subjects`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<SchoolSubject[]> {
    return this.http.get<SchoolSubject[]>(this.base);
  }

  getById(id: number): Observable<SchoolSubject> {
    return this.http.get<SchoolSubject>(`${this.base}/${id}`);
  }

  create(body: Pick<SchoolSubject, 'code' | 'name'>): Observable<SchoolSubject> {
    return this.http.post<SchoolSubject>(this.base, body);
  }

  update(id: number, body: Pick<SchoolSubject, 'code' | 'name'>): Observable<SchoolSubject> {
    return this.http.put<SchoolSubject>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

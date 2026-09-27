import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { SchoolSubject } from '../models/subject.models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly base = `${API_BASE_URL}/api/subjects`;

  constructor(private readonly http: HttpClient) {}

  private schoolParams(schoolId: number, classId?: number): HttpParams {
    let params = new HttpParams().set('schoolId', String(schoolId));
    if (classId != null) {
      params = params.set('classId', String(classId));
    }
    return params;
  }

  /**
   * Catalogue école. Si {@code classId} est fourni, uniquement les matières compatibles
   * avec le cycle de la classe.
   */
  list(schoolId: number, classId?: number): Observable<SchoolSubject[]> {
    return this.http.get<SchoolSubject[]>(this.base, { params: this.schoolParams(schoolId, classId) });
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

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';
import { CreateSchoolYearPayload, SchoolYearDto } from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class SchoolYearService {
  private readonly base = `${API_BASE_URL}/api/school-years`;

  constructor(private readonly http: HttpClient) {}

  /** Année marquée active pour l’établissement ; {@code null} si 404. */
  getActiveForSchool(schoolId: number): Observable<SchoolYearDto | null> {
    return this.http.get<SchoolYearDto>(`${this.base}/school/${schoolId}/active`).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        return throwError(() => err);
      })
    );
  }

  listBySchool(schoolId: number): Observable<SchoolYearDto[]> {
    return this.http.get<SchoolYearDto[]>(`${this.base}/school/${schoolId}`);
  }

  getById(id: number): Observable<SchoolYearDto & { school?: { id: number } }> {
    return this.http.get<SchoolYearDto & { school?: { id: number } }>(`${this.base}/${id}`);
  }

  create(payload: CreateSchoolYearPayload): Observable<SchoolYearDto> {
    return this.http.post<SchoolYearDto>(this.base, payload);
  }

  update(id: number, payload: CreateSchoolYearPayload): Observable<SchoolYearDto> {
    return this.http.put<SchoolYearDto>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

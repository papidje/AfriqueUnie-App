import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';
import { ParentListRowDto } from '../models/parent-list.models';
import { ParentDetailDto } from '../models/student-list.models';

export interface ParentWritePayload {
  lastName: string;
  firstName: string;
  phone: string;
  email: string | null;
  profession: string | null;
  address: string | null;
}

@Injectable({ providedIn: 'root' })
export class ParentApiService {
  private readonly base = `${API_BASE_URL}/api/parents`;

  constructor(private readonly http: HttpClient) {}

  /** Parents avec au moins un enfant inscrit dans l’année scolaire active de l’établissement. */
  listForSchoolActiveYear(schoolId: number): Observable<ParentListRowDto[]> {
    return this.http
      .get<ParentListRowDto[]>(`${this.base}/by-school/${schoolId}/active-year-enrolled`)
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  /** Retourne le parent si trouvé, sinon `null` (404). */
  findByPhone(phone: string): Observable<ParentDetailDto | null> {
    const params = new HttpParams().set('phone', phone.trim().replace(/\s+/g, ''));
    return this.http.get<ParentDetailDto>(`${this.base}/by-phone`, { params }).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        return throwError(() => err);
      })
    );
  }

  getById(parentId: number): Observable<ParentDetailDto> {
    return this.http.get<ParentDetailDto>(`${this.base}/${parentId}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  update(parentId: number, body: ParentWritePayload): Observable<ParentDetailDto> {
    return this.http.put<ParentDetailDto>(`${this.base}/${parentId}`, body).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }
}

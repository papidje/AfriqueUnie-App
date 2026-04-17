import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';
import { ParentDto, ParentRegistrationDto } from '../models/student-registration.models';

@Injectable({ providedIn: 'root' })
export class ParentApiService {
  private readonly base = `${API_BASE_URL}/api/parents`;

  constructor(private readonly http: HttpClient) {}

  findByPhone(phone: string): Observable<ParentDto | null> {
    const p = (phone || '').trim();
    if (!p) {
      return of(null);
    }
    return this.http.get<ParentDto>(`${this.base}/by-phone?phone=${encodeURIComponent(p)}`).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        return throwError(() => err);
      })
    );
  }

  create(payload: ParentRegistrationDto): Observable<ParentDto> {
    return this.http.post<ParentDto>(this.base, payload);
  }
}


import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';
import { StudentListRow } from '../models/student-list.models';

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly base = `${API_BASE_URL}/api/students`;

  constructor(private readonly http: HttpClient) {}

  getByClass(classId: number): Observable<StudentListRow[]> {
    return this.http
      .get<StudentListRow[]>(`${this.base}/by-class/${classId}`)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }
}


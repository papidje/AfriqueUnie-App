import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';
import {
  CreateStudentPaymentPayload,
  CreateStudentPaymentResponse,
  StudentPaymentInfoDto,
  StudentPaymentStatusDto
} from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly base = `${API_BASE_URL}/api/finance`;

  constructor(private readonly http: HttpClient) {}

  getStatusByClass(classId: number): Observable<StudentPaymentStatusDto[]> {
    return this.http.get<StudentPaymentStatusDto[]>(`${this.base}/status/${classId}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  getPaymentInfo(studentId: number): Observable<StudentPaymentInfoDto> {
    return this.http.get<StudentPaymentInfoDto>(`${this.base}/payment-info/${studentId}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  createPayment(studentId: number, payload: CreateStudentPaymentPayload): Observable<CreateStudentPaymentResponse> {
    return this.http.post<CreateStudentPaymentResponse>(`${this.base}/payments/${studentId}`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }
}


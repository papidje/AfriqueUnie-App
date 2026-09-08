import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';
import {
  StudentDetailDto,
  StudentListRow,
  StudentProfileUpdatePayload
} from '../models/student-list.models';

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly base = `${API_BASE_URL}/api/students`;

  constructor(private readonly http: HttpClient) {}

  getById(studentId: number): Observable<StudentDetailDto> {
    return this.http.get<StudentDetailDto>(`${this.base}/${studentId}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  getByClass(classId: number): Observable<StudentListRow[]> {
    return this.http
      .get<StudentListRow[]>(`${this.base}/by-class/${classId}`)
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  updateProfile(studentId: number, body: StudentProfileUpdatePayload): Observable<StudentDetailDto> {
    return this.http.patch<StudentDetailDto>(`${this.base}/${studentId}`, body).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  uploadPhoto(studentId: number, file: File): Observable<StudentDetailDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<StudentDetailDto>(`${this.base}/${studentId}/photo`, formData).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  generateEnrollmentCertificate(studentId: number): Observable<Blob> {
    return this.http
      .get(`${this.base}/${studentId}/documents/enrollment-certificate`, { responseType: 'blob' })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  unlinkFather(studentId: number): Observable<void> {
    return this.http.delete(`${this.base}/${studentId}/father`, { observe: 'response' }).pipe(
      map(() => undefined),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  unlinkMother(studentId: number): Observable<void> {
    return this.http.delete(`${this.base}/${studentId}/mother`, { observe: 'response' }).pipe(
      map(() => undefined),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  getUnassignedBySchool(schoolId: number): Observable<StudentListRow[]> {
    return this.http
      .get<StudentListRow[]>(`${this.base}/school/${schoolId}/unassigned`)
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  transferToClass(studentId: number, classId: number): Observable<StudentDetailDto> {
    return this.http
      .post<StudentDetailDto>(`${this.base}/${studentId}/transfer`, { classId })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  unassignFromClass(studentId: number): Observable<StudentDetailDto> {
    return this.http
      .post<StudentDetailDto>(`${this.base}/${studentId}/unassign`, {})
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  unenroll(studentId: number): Observable<StudentDetailDto> {
    return this.http
      .post<StudentDetailDto>(`${this.base}/${studentId}/unenroll`, {})
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  deleteStudent(studentId: number): Observable<void> {
    return this.http.delete(`${this.base}/${studentId}`, { observe: 'response' }).pipe(
      map(() => undefined),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }
}

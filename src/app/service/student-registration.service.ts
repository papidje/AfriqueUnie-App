import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import {
  FamilyPreviewResponse,
  RegistrationDto,
  StudentRegistrationResponse
} from '../models/student-registration.models';

@Injectable({ providedIn: 'root' })
export class StudentRegistrationService {
  private readonly base = `${API_BASE_URL}/api/student-registrations`;

  constructor(private readonly http: HttpClient) {}

  registerStudent(payload: RegistrationDto): Observable<StudentRegistrationResponse> {
    return this.http.post<StudentRegistrationResponse>(this.base, payload);
  }

  previewFamily(fatherPhone: string, motherPhone: string): Observable<FamilyPreviewResponse> {
    const params = new HttpParams().set('fatherPhone', fatherPhone).set('motherPhone', motherPhone);
    return this.http.get<FamilyPreviewResponse>(`${this.base}/family-preview`, { params });
  }
}

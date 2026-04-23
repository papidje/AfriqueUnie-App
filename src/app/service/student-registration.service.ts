import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { RegistrationDto, StudentRegistrationResponse } from '../models/student-registration.models';

@Injectable({ providedIn: 'root' })
export class StudentRegistrationService {
  private readonly base = `${API_BASE_URL}/api/student-registrations`;

  constructor(private readonly http: HttpClient) {}

  registerStudent(payload: RegistrationDto): Observable<StudentRegistrationResponse> {
    return this.http.post<StudentRegistrationResponse>(this.base, payload);
  }
}


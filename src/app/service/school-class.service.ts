import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { SchoolClassDto, SchoolClassPeriodType } from '../models/academic.models';

export interface CreateSchoolClassRequest {
  name: string;
  year: { id: number };
  level: { id: number };
  capacity?: number;
  periodType?: SchoolClassPeriodType;
}

@Injectable({ providedIn: 'root' })
export class SchoolClassService {
  private readonly base = `${API_BASE_URL}/api/school-classes`;

  constructor(private readonly http: HttpClient) {}

  listForActiveSchoolYear(schoolId: number): Observable<SchoolClassDto[]> {
    return this.http.get<SchoolClassDto[]>(`${this.base}/school/${schoolId}/active-year`);
  }

  /** Liste enrichie (effectifs, matières, capacité) pour la page Classes. */
  listOverviewForActiveSchoolYear(schoolId: number): Observable<SchoolClassDto[]> {
    return this.http.get<SchoolClassDto[]>(`${this.base}/school/${schoolId}/active-year/overview`);
  }

  getById(classId: number): Observable<SchoolClassDto> {
    return this.http.get<SchoolClassDto>(`${this.base}/${classId}`);
  }

  create(body: CreateSchoolClassRequest): Observable<SchoolClassDto> {
    return this.http.post<SchoolClassDto>(this.base, body);
  }

  updatePeriodType(classId: number, periodType: SchoolClassPeriodType): Observable<void> {
    return this.http.put<void>(`${this.base}/${classId}/period-type`, { periodType });
  }

  updateGradingPeriodsSchedule(
    classId: number,
    periods: { id: number; startDate: string; endDate: string; name?: string }[]
  ): Observable<void> {
    return this.http.put<void>(`${this.base}/${classId}/grading-periods/schedule`, { periods });
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface DashboardStudent {
  id: number;
  fullName: string;
  className: string;
  enrolledAt: string;
}

/** Réponse `/dashboard/summary` — indicateurs pour l’année scolaire active de l’établissement. */
export interface DashboardSummary {
  studentsEnrolled: number;
  totalCapacity: number;
  classesCount: number;
  taughtSubjectsCount: number;
  monthlyTuitionCollected: number;
  schoolYearTuitionCollected: number;
  recentEnrollments: DashboardStudent[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${API_BASE_URL}/dashboard/summary`;

  constructor(private readonly http: HttpClient) {}

  /** @param schoolId établissement ciblé (obligatoire pour admin multi-écoles et super admin ; optionnel si un seul établissement ou compte rattaché à une école). */
  getSummary(schoolId?: number | null): Observable<DashboardSummary> {
    let params = new HttpParams();
    if (schoolId != null && Number.isFinite(schoolId) && schoolId > 0) {
      params = params.set('schoolId', String(schoolId));
    }
    return this.http.get<DashboardSummary>(this.apiUrl, { params });
  }
}

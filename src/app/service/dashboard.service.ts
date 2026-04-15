import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStudent {
  id: number;
  fullName: string;
  className: string;
  enrolledAt: string;
}

export interface DashboardSummary {
  studentsCount: number;
  monthlyTuitionCollected: number;
  recentEnrollments: DashboardStudent[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:8080/api/rest/dashboard/summary?mock=true';

  constructor(private readonly http: HttpClient) {}

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.apiUrl);
  }
}

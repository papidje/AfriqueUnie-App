import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { PeriodNotesGridResponse, StudentPeriodDashboardResponse } from '../models/grading.models';

@Injectable({ providedIn: 'root' })
export class GradingApiService {
  private readonly base = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  /** Notes et moyennes par matière pour un élève sur une période (fiche élève, bulletin). */
  getStudentPeriodDashboard(studentId: number, periodId: number): Observable<StudentPeriodDashboardResponse> {
    return this.http.get<StudentPeriodDashboardResponse>(
      `${this.base}/api/students/${studentId}/grading-periods/${periodId}/period-dashboard`
    );
  }

  /** PDF bulletin individuel (mêmes données que le tableau de bord période). */
  downloadStudentBulletinPdf(studentId: number, periodId: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/api/students/${studentId}/grading-periods/${periodId}/bulletin-pdf`,
      { responseType: 'blob' }
    );
  }

  getPeriodNotesGrid(classId: number, periodId: number): Observable<PeriodNotesGridResponse> {
    return this.http.get<PeriodNotesGridResponse>(
      `${this.base}/api/school-classes/${classId}/grading-periods/${periodId}/notes-grid`
    );
  }

  /** PDF : relevé de notes global pour la classe sur la période (mêmes données que la grille). */
  downloadPeriodNotesPdf(classId: number, periodId: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/api/school-classes/${classId}/grading-periods/${periodId}/notes-grid/pdf`,
      { responseType: 'blob' }
    );
  }
}

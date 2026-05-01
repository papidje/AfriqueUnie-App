import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import {
  CreateEvaluationRequest,
  EvaluationResponse,
  GradeSheetResponse,
  GradeUpsertRequest,
  GradingPeriodSummary
} from '../models/evaluation.models';

@Injectable({ providedIn: 'root' })
export class EvaluationApiService {
  private readonly base = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  listGradingPeriods(classId: number): Observable<GradingPeriodSummary[]> {
    return this.http.get<GradingPeriodSummary[]>(`${this.base}/api/school-classes/${classId}/grading-periods`);
  }

  listForClass(classId: number): Observable<EvaluationResponse[]> {
    return this.http.get<EvaluationResponse[]>(`${this.base}/api/school-classes/${classId}/evaluations`);
  }

  create(classId: number, body: CreateEvaluationRequest): Observable<EvaluationResponse> {
    return this.http.post<EvaluationResponse>(`${this.base}/api/school-classes/${classId}/evaluations`, body);
  }

  getById(evaluationId: number): Observable<EvaluationResponse> {
    return this.http.get<EvaluationResponse>(`${this.base}/api/evaluations/${evaluationId}`);
  }

  getGradeSheet(evaluationId: number): Observable<GradeSheetResponse> {
    return this.http.get<GradeSheetResponse>(`${this.base}/api/evaluations/${evaluationId}/grade-sheet`);
  }

  saveGrades(evaluationId: number, rows: GradeUpsertRequest[]): Observable<void> {
    return this.http.put<void>(`${this.base}/api/evaluations/${evaluationId}/grades`, rows);
  }
}

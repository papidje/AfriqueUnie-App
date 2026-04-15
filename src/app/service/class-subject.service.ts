import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import {
  ClassPlanningView,
  ClassSubjectRow,
  CreateClassSubjectPayload,
  TeacherSummary
} from '../models/subject.models';

@Injectable({ providedIn: 'root' })
export class ClassSubjectService {
  private readonly api = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  listForClass(classId: number): Observable<ClassSubjectRow[]> {
    return this.http.get<ClassSubjectRow[]>(`${this.api}/api/school-classes/${classId}/class-subjects`);
  }

  getPlanning(classId: number): Observable<ClassPlanningView> {
    return this.http.get<ClassPlanningView>(`${this.api}/api/school-classes/${classId}/planning`);
  }

  listTeachersForSchool(schoolId: number): Observable<TeacherSummary[]> {
    return this.http.get<TeacherSummary[]>(`${this.api}/schools/${schoolId}/teachers`);
  }

  assignTeacher(classSubjectId: number, teacherId: number | null): Observable<ClassSubjectRow> {
    return this.http.put<ClassSubjectRow>(`${this.api}/api/class-subjects/${classSubjectId}/teacher`, {
      teacherId
    });
  }

  create(classId: number, body: CreateClassSubjectPayload): Observable<ClassSubjectRow> {
    return this.http.post<ClassSubjectRow>(`${this.api}/api/school-classes/${classId}/class-subjects`, body);
  }

  updateCoefficient(id: number, coefficient: number): Observable<ClassSubjectRow> {
    return this.http.put<ClassSubjectRow>(`${this.api}/api/class-subjects/${id}/coefficient`, { coefficient });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/api/class-subjects/${id}`);
  }
}

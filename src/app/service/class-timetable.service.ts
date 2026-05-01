import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { TimetableCellWriteDto, TimetableViewDto } from '../models/timetable.models';

export interface TimetableGetOptions {
  /** Lundi (ISO) de la semaine affichée, ex. `2026-04-20`. */
  weekStart?: string;
  includeEvaluations?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClassTimetableService {
  private readonly api = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  getTimetable(classId: number, options?: TimetableGetOptions): Observable<TimetableViewDto> {
    let params = new HttpParams();
    if (options?.weekStart) {
      params = params.set('weekStart', options.weekStart);
    }
    if (options?.includeEvaluations === true) {
      params = params.set('includeEvaluations', 'true');
    }
    return this.http.get<TimetableViewDto>(`${this.api}/api/school-classes/${classId}/timetable`, { params });
  }

  setCell(classId: number, body: TimetableCellWriteDto): Observable<TimetableViewDto> {
    return this.http.put<TimetableViewDto>(`${this.api}/api/school-classes/${classId}/timetable/cell`, body);
  }
}

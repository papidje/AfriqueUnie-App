import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { TimetableCellWriteDto, TimetableViewDto } from '../models/timetable.models';

@Injectable({ providedIn: 'root' })
export class ClassTimetableService {
  private readonly api = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  getTimetable(classId: number): Observable<TimetableViewDto> {
    return this.http.get<TimetableViewDto>(`${this.api}/api/school-classes/${classId}/timetable`);
  }

  setCell(classId: number, body: TimetableCellWriteDto): Observable<TimetableViewDto> {
    return this.http.put<TimetableViewDto>(`${this.api}/api/school-classes/${classId}/timetable/cell`, body);
  }
}

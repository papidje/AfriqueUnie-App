import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { FeeStructureDto, FeeStructureWritePayload } from '../models/fee-structure.models';

@Injectable({ providedIn: 'root' })
export class FeeStructureService {
  private readonly base = `${API_BASE_URL}/api/fee-structures`;

  constructor(private readonly http: HttpClient) {}

  listBySchoolYear(schoolYearId: number): Observable<FeeStructureDto[]> {
    return this.http.get<FeeStructureDto[]>(`${this.base}?schoolYearId=${schoolYearId}`);
  }

  create(payload: FeeStructureWritePayload): Observable<FeeStructureDto> {
    return this.http.post<FeeStructureDto>(this.base, payload);
  }

  update(id: number, payload: FeeStructureWritePayload): Observable<FeeStructureDto> {
    return this.http.put<FeeStructureDto>(`${this.base}/${id}`, payload);
  }
}

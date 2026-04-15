import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {School} from "./school-list/school-list.component";

@Injectable({ providedIn: 'root' })
export class SchoolService {
  private apiUrl = 'http://localhost:8080/api/rest/schools';

  constructor(private http: HttpClient) {}

  getAll(): Observable<School[]> {
    return this.http.get<School[]>(this.apiUrl);
  }

  create(school: Partial<School>): Observable<School> {
    return this.http.post<School>(this.apiUrl, school);
  }

  update(id: number, school: Partial<School>): Observable<School> {
    return this.http.put<School>(`${this.apiUrl}/${id}`, school);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: number, active: boolean): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/active/${active}`, {});
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  assignAdministrator(schoolId: number, adminId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${schoolId}/assign/${adminId}`, {});
  }

  removeAdministrator(schoolId: number, adminId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${schoolId}/admins/${adminId}`);
  }
}

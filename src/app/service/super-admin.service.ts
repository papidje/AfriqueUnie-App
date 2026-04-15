import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TenantSchoolSummary {
  id: number;
  name: string;
  active: boolean;
}

export interface SuperAdminTenantRow {
  id: number;
  name: string;
  address: string | null;
  logo: string | null;
  createdAt: string;
  schools: TenantSchoolSummary[];
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly apiUrl = 'http://localhost:8080/api/rest';

  constructor(private readonly http: HttpClient) {}

  getTenantsWithSchools(): Observable<SuperAdminTenantRow[]> {
    return this.http.get<SuperAdminTenantRow[]>(`${this.apiUrl}/super-admin/tenants`);
  }
}

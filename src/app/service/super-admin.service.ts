import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { SchoolSubject } from '../models/subject.models';

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

export interface GeoTotals {
  schools: number;
  schoolsWithCity: number;
  schoolsWithoutCity: number;
  students: number;
  studentsWithCity: number;
  studentsWithoutCity: number;
}

export interface GeoRegionStats {
  regionId: number;
  regionCode: string;
  regionName: string;
  schoolCount: number;
  activeSchoolCount: number;
  studentCount: number;
}

export interface GeoCityStats {
  cityId: number;
  cityCode: string;
  cityName: string;
  regionId: number | null;
  regionCode: string | null;
  regionName: string | null;
  latitude: number;
  longitude: number;
  schoolCount: number;
  activeSchoolCount: number;
  studentCount: number;
}

export interface SuperAdminGeoStats {
  totals: GeoTotals;
  byRegion: GeoRegionStats[];
  byCity: GeoCityStats[];
}

export interface SuperAdminSchoolRow {
  id: number;
  name: string;
  adress: string | null;
  contact: string | null;
  openDate: string | null;
  logo: string | null;
  active: boolean;
  createdAt: string | null;
  tenantId: number | null;
  tenantName: string | null;
  cityId: number | null;
  cityName: string | null;
  regionName: string | null;
  studentCount: number;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly apiUrl = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  getTenantsWithSchools(): Observable<SuperAdminTenantRow[]> {
    return this.http.get<SuperAdminTenantRow[]>(`${this.apiUrl}/super-admin/tenants`);
  }

  getSchools(): Observable<SuperAdminSchoolRow[]> {
    return this.http.get<SuperAdminSchoolRow[]>(`${this.apiUrl}/super-admin/schools`);
  }

  getGeoStats(): Observable<SuperAdminGeoStats> {
    return this.http.get<SuperAdminGeoStats>(`${this.apiUrl}/super-admin/geo/stats`);
  }

  listGlobalSubjects(): Observable<SchoolSubject[]> {
    return this.http.get<SchoolSubject[]>(`${this.apiUrl}/super-admin/subjects`);
  }

  createGlobalSubject(body: Pick<SchoolSubject, 'code' | 'name'>): Observable<SchoolSubject> {
    return this.http.post<SchoolSubject>(`${this.apiUrl}/super-admin/subjects`, body);
  }

  updateGlobalSubject(
    id: number,
    body: Pick<SchoolSubject, 'code' | 'name'>
  ): Observable<SchoolSubject> {
    return this.http.put<SchoolSubject>(`${this.apiUrl}/super-admin/subjects/${id}`, body);
  }

  deleteGlobalSubject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/super-admin/subjects/${id}`);
  }
}

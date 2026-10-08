import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { SchoolSubject } from '../models/subject.models';
import {
  SubjectAdditionRequestComment,
  SubjectAdditionRequestDetail,
  SubjectAdditionRequestSummary
} from '../models/subject-addition-request.models';

export interface TenantSchoolSummary {
  id: number;
  name: string;
  active: boolean;
}

export interface TenantAdminSummary {
  id: number;
  fullname: string;
  email: string | null;
}

export interface SuperAdminTenantRow {
  id: number;
  name: string;
  address: string | null;
  logo: string | null;
  createdAt: string;
  active: boolean;
  subscriptionEndsOn: string | null;
  studentCount: number;
  admins: TenantAdminSummary[];
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

export interface SuperAdminSchoolCard {
  id: number;
  name: string;
  logo: string | null;
  active: boolean;
  cityName: string | null;
  regionName: string | null;
  studentCount: number;
  activeYearStudentCount: number;
  classCount: number;
  activeYearLabel: string | null;
}

export interface SuperAdminTenantDetail {
  id: number;
  name: string;
  address: string | null;
  logo: string | null;
  createdAt: string;
  active: boolean;
  subscriptionEndsOn: string | null;
  studentCount: number;
  schoolCount: number;
  activeSchoolCount: number;
  admins: TenantAdminSummary[];
  schools: SuperAdminSchoolCard[];
}

export interface SuperAdminSchoolYearSummary {
  id: number;
  label: string;
  active: boolean;
}

export interface SuperAdminSchoolDetail {
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
  tenantActive: boolean;
  cityId: number | null;
  cityName: string | null;
  regionName: string | null;
  studentCount: number;
  activeYearStudentCount: number;
  classCount: number;
  capacity: number;
  staffCount: number;
  teacherCount: number;
  activeYearLabel: string | null;
  schoolYears: SuperAdminSchoolYearSummary[];
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly apiUrl = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  getTenantsWithSchools(): Observable<SuperAdminTenantRow[]> {
    return this.http.get<SuperAdminTenantRow[]>(`${this.apiUrl}/super-admin/tenants`);
  }

  getTenantDetail(id: number): Observable<SuperAdminTenantDetail> {
    return this.http.get<SuperAdminTenantDetail>(`${this.apiUrl}/super-admin/tenants/${id}`);
  }

  setTenantActive(
    id: number,
    active: boolean,
    body?: { subscriptionEndsOn?: string | null }
  ): Observable<SuperAdminTenantRow> {
    return this.http.patch<SuperAdminTenantRow>(
      `${this.apiUrl}/super-admin/tenants/${id}/active/${active}`,
      body ?? {}
    );
  }

  getSchools(): Observable<SuperAdminSchoolRow[]> {
    return this.http.get<SuperAdminSchoolRow[]>(`${this.apiUrl}/super-admin/schools`);
  }

  getSchoolDetail(id: number): Observable<SuperAdminSchoolDetail> {
    return this.http.get<SuperAdminSchoolDetail>(`${this.apiUrl}/super-admin/schools/${id}`);
  }

  getGeoStats(): Observable<SuperAdminGeoStats> {
    return this.http.get<SuperAdminGeoStats>(`${this.apiUrl}/super-admin/geo/stats`);
  }

  listLevelGroupOptions(): Observable<{ code: string; name: string }[]> {
    return this.http.get<{ code: string; name: string }[]>(`${this.apiUrl}/super-admin/class-level-groups`);
  }

  listGlobalSubjects(): Observable<SchoolSubject[]> {
    return this.http.get<SchoolSubject[]>(`${this.apiUrl}/super-admin/subjects`);
  }

  createGlobalSubject(body: {
    code: string;
    name: string;
    levelGroupCodes: string[];
  }): Observable<SchoolSubject> {
    return this.http.post<SchoolSubject>(`${this.apiUrl}/super-admin/subjects`, body);
  }

  updateGlobalSubject(
    id: number,
    body: { code: string; name: string; levelGroupCodes: string[] }
  ): Observable<SchoolSubject> {
    return this.http.put<SchoolSubject>(`${this.apiUrl}/super-admin/subjects/${id}`, body);
  }

  deleteGlobalSubject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/super-admin/subjects/${id}`);
  }

  listSubjectAdditionRequests(
    status: 'ALL' | 'OPEN' | 'CLOSED' = 'OPEN'
  ): Observable<SubjectAdditionRequestSummary[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<SubjectAdditionRequestSummary[]>(
      `${this.apiUrl}/super-admin/subject-addition-requests`,
      { params }
    );
  }

  getSubjectAdditionRequest(id: number): Observable<SubjectAdditionRequestDetail> {
    return this.http.get<SubjectAdditionRequestDetail>(
      `${this.apiUrl}/super-admin/subject-addition-requests/${id}`
    );
  }

  commentSubjectAdditionRequest(id: number, body: string): Observable<SubjectAdditionRequestComment> {
    return this.http.post<SubjectAdditionRequestComment>(
      `${this.apiUrl}/super-admin/subject-addition-requests/${id}/comments`,
      { body }
    );
  }

  acceptSubjectAdditionRequest(
    id: number,
    body: { code: string; name?: string; levelGroupCodes?: string[] }
  ): Observable<SubjectAdditionRequestDetail> {
    return this.http.post<SubjectAdditionRequestDetail>(
      `${this.apiUrl}/super-admin/subject-addition-requests/${id}/accept`,
      body
    );
  }

  refuseSubjectAdditionRequest(
    id: number,
    comment?: string
  ): Observable<SubjectAdditionRequestDetail> {
    return this.http.post<SubjectAdditionRequestDetail>(
      `${this.apiUrl}/super-admin/subject-addition-requests/${id}/refuse`,
      { comment: comment ?? null }
    );
  }
}

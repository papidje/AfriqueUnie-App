import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserRoleNameType } from '../core/app-roles';
import { API_BASE_URL } from '../core/api-base';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${API_BASE_URL}/users`;

  constructor(private readonly http: HttpClient) {}

  inviteMember(data: {
    nom: string;
    email: string;
    role: UserRoleNameType;
    schoolId?: number | null;
  }): Observable<any> {
    const body: Record<string, unknown> = {
      nom: data.nom,
      email: data.email,
      role: data.role
    };
    if (data.schoolId != null && Number.isFinite(data.schoolId)) {
      body['schoolId'] = data.schoolId;
    }
    return this.http.post(`${this.apiUrl}/invite`, body);
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  /** Nouveau code d’activation par e-mail (comptes encore inactifs). */
  resendActivationEmail(userId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/resend-activation`, {});
  }

  getUserInfo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/userInfo`);
  }

  changePassword(body: ChangePasswordPayload): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/change-password`, body);
  }

  getAdmins(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admins`);
  }

  getAdminsBySchool(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/admins-by-school/${id}`);
  }

  searchAdmins(term: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/search-admins/${term}`);
  }
}

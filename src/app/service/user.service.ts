import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserRoleNameType } from '../core/app-roles';
import { API_BASE_URL } from '../core/api-base';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Corps attendu par {@code PATCH /users/profile} (champs optionnels sauf nom affiché côté serveur). */
export interface OwnProfileUpdatePayload {
  /** Rétrocompatibilité ; ignoré si {@code lastName} est fourni. */
  fullname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  phone?: string | null;
  biography?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${API_BASE_URL}/users`;

  constructor(private readonly http: HttpClient) {}

  inviteMember(data: {
    email: string;
    role: UserRoleNameType;
    schoolId?: number | null;
    schoolAssignments?: { schoolId: number; role: UserRoleNameType }[];
  }): Observable<any> {
    const body: Record<string, unknown> = {
      email: data.email,
      role: data.role
    };
    if (data.schoolId != null && Number.isFinite(data.schoolId)) {
      body['schoolId'] = data.schoolId;
    }
    if (data.schoolAssignments?.length) {
      body['schoolAssignments'] = data.schoolAssignments;
    }
    return this.http.post(`${this.apiUrl}/invite`, body);
  }

  patchUserAffiliations(
    userId: number,
    assignments: { schoolId: number; role: UserRoleNameType }[]
  ): Observable<unknown> {
    return this.http.patch<unknown>(`${this.apiUrl}/${userId}/affiliations`, { assignments });
  }

  /** Fondateur : suspend l’accès à un établissement (toutes les lignes d’affiliation pour cette école). */
  suspendAffiliation(userId: number, schoolId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/schools/${schoolId}/suspend`, {});
  }

  /** Fondateur : lève la suspension pour cet établissement. */
  reactivateAffiliation(userId: number, schoolId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/schools/${schoolId}/reactivate`, {});
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

  updateOwnProfile(body: OwnProfileUpdatePayload): Observable<unknown> {
    return this.http.patch<unknown>(`${this.apiUrl}/profile`, body);
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

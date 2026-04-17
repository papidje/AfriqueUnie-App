import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import { UserRoleNameType } from '../core/app-roles';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/rest/users'; // URL de ton backend

  constructor(private http: HttpClient) { }

  inviteMember(data: {
    nom: string;
    email: string;
    role: UserRoleNameType;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/invite`, {
      ...data,
    });
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  getUserInfo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/userInfo`);
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

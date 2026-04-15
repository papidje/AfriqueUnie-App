import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable, tap} from "rxjs";
import { UserRoleName } from '../core/app-roles';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/rest/users'; // URL de ton backend

  constructor(private http: HttpClient) { }

  register(data: {fullname: string, username: string, email: string, password: string}): Observable<any> {
    return this.http.post(`${this.apiUrl}/registery`, data);
  }

  createStaff(data: {
    fullname: string;
    username: string;
    email: string;
    password: string;
    schoolId: number | null;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/registery`, {
      ...data,
      role: UserRoleName.STAFF
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

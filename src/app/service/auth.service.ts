import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8080/api/rest'; // URL de ton backend

  constructor(private http: HttpClient) { }

  login(credentials: {userName: string, password: string}): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials);
  }

  register(data: {fullname: string, username: string, email: string, password: string}): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/registery`, data);
  }

  activate(data: {userMail: string, code: string}): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/activate`, data);
  }

  getUsers(): Observable<any> {
    return  this.http.get(`${this.baseUrl}/users`);
  }
}

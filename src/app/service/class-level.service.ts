import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';
import { ClassLevel } from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class ClassLevelService {
  private readonly base = `${API_BASE_URL}/api/class-levels`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<ClassLevel[]> {
    return this.http.get<ClassLevel[]>(this.base);
  }
}

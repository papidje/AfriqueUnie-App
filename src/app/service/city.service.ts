import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface RegionDto {
  id: number;
  code: string;
  name: string;
  active?: boolean;
}

export interface CityDto {
  id: number;
  code: string;
  name: string;
  /** Présent sur les réponses admin (DTO plat). */
  regionId?: number | null;
  regionCode?: string | null;
  regionName?: string | null;
  /** Présent sur les réponses entité (GET /api/cities). */
  region?: RegionDto | null;
  latitude: number;
  longitude: number;
  active?: boolean;
  schoolCount?: number;
}

export interface CityWritePayload {
  code: string;
  name: string;
  regionId: number;
  latitude: number;
  longitude: number;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CityService {
  private readonly publicBase = `${API_BASE_URL}/api/cities`;
  private readonly adminBase = `${API_BASE_URL}/super-admin/cities`;
  private readonly regionsAdminBase = `${API_BASE_URL}/super-admin/regions`;

  constructor(private readonly http: HttpClient) {}

  /** Villes actives (formulaires école). */
  listActive(): Observable<CityDto[]> {
    return this.http.get<CityDto[]>(this.publicBase);
  }

  listAllAdmin(): Observable<CityDto[]> {
    return this.http.get<CityDto[]>(this.adminBase);
  }

  listRegionsAdmin(): Observable<RegionDto[]> {
    return this.http.get<RegionDto[]>(this.regionsAdminBase);
  }

  create(body: CityWritePayload): Observable<CityDto> {
    return this.http.post<CityDto>(this.adminBase, body);
  }

  update(id: number, body: CityWritePayload): Observable<CityDto> {
    return this.http.put<CityDto>(`${this.adminBase}/${id}`, body);
  }

  setActive(id: number, active: boolean): Observable<CityDto> {
    return this.http.patch<CityDto>(`${this.adminBase}/${id}/active/${active}`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/${id}`);
  }
}

/** Libellé région pour affichage (DTO plat ou objet imbriqué). */
export function cityRegionLabel(city: CityDto | null | undefined): string {
  if (!city) {
    return '';
  }
  return city.regionName || city.region?.name || '';
}

import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { SchoolService } from '../modules/admin/school/school.service';
import { School } from '../modules/admin/school/school-list/school-list.component';
import { AuthUtilsService } from './auth-utils.service';
import { ActiveSchoolService } from './active-school.service';
import { AppRoles } from '../core/app-roles';
import {
  ALL_FONT_BODY_CLASSES,
  ALL_THEME_BODY_CLASSES,
  normalizeFontKey,
  normalizeThemeKey,
  toFontClass,
  toThemeClass
} from '../core/school-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  constructor(
    private readonly authUtils: AuthUtilsService,
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolService: SchoolService
  ) {}

  /**
   * Au démarrage : d’abord le JWT ; puis, si l’établissement actif change, rechargement via API
   * (utile notamment pour les admins multi-écoles, ou après mise à jour des préférences).
   */
  init(): void {
    this.applyFromJwt();
    if (this.authUtils.isSuperAdmin()) {
      this.applyKeys('classique', 'inter');
      return;
    }

    this.activeSchool.activeSchoolId$
      .pipe(
        filter((id): id is number => id != null),
        distinctUntilChanged()
      )
      .subscribe((id) => {
        this.schoolService.getById(id).subscribe({
          next: (s) => this.applyFromSchool(s),
          error: () => this.applyFromJwt()
        });
      });
  }

  /** Appeler après login / refresh token. */
  applyFromJwt(): void {
    const t = this.getToken();
    if (!t) {
      this.applyKeys('classique', 'inter');
      return;
    }
    try {
      const dec = jwtDecode<Record<string, unknown>>(t);
      const th = dec['school_theme'] ?? dec['schoolTheme'];
      const fn = dec['school_font'] ?? dec['schoolFont'];
      this.applyKeys(
        typeof th === 'string' ? th : 'classique',
        typeof fn === 'string' ? fn : 'inter'
      );
    } catch {
      this.applyKeys('classique', 'inter');
    }
  }

  applyFromSchool(school: School | null | undefined): void {
    if (!school) {
      this.applyFromJwt();
      return;
    }
    const s = school as School & { themeName?: string; fontName?: string };
    this.applyKeys(s.themeName, s.fontName);
  }

  applyKeys(themeKey: string | null | undefined, fontKey: string | null | undefined): void {
    const b = document.body;
    for (const c of ALL_THEME_BODY_CLASSES) {
      b.classList.remove(c);
    }
    for (const c of ALL_FONT_BODY_CLASSES) {
      b.classList.remove(c);
    }
    b.classList.add('mat-typography');
    b.classList.add(toThemeClass(normalizeThemeKey(themeKey)));
    b.classList.add(toFontClass(normalizeFontKey(fontKey)));
  }

  private getToken(): string | null {
    return localStorage.getItem('jwt');
  }
}

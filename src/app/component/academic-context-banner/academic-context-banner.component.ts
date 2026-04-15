import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { SchoolYearService } from '../../service/school-year.service';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { AppRoles } from '../../core/app-roles';
import { SchoolYearDto } from '../../models/academic.models';

export interface AcademicBannerVm {
  visible: boolean;
  schoolId: number | null;
  year: SchoolYearDto | null;
}

@Component({
  selector: 'app-academic-context-banner',
  templateUrl: './academic-context-banner.component.html',
  styleUrls: ['./academic-context-banner.component.scss']
})
export class AcademicContextBannerComponent {
  readonly vm$: Observable<AcademicBannerVm> = this.activeSchool.activeSchoolId$.pipe(
    distinctUntilChanged(),
    switchMap((schoolId) => {
      const visible =
        !this.authUtils.isSuperAdmin() &&
        this.authUtils.hasAnyRole([AppRoles.ADMIN_ECOLE, AppRoles.STAFF]) &&
        schoolId != null;

      if (!visible || schoolId == null) {
        return of<AcademicBannerVm>({ visible: false, schoolId: null, year: null });
      }

      return this.schoolYearService.getActiveForSchool(schoolId).pipe(
        map((year) => ({ visible: true, schoolId, year }))
      );
    })
  );

  constructor(
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolYearService: SchoolYearService,
    private readonly authUtils: AuthUtilsService,
    public readonly router: Router
  ) {}
}

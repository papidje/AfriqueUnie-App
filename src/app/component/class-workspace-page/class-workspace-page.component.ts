import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ClassWorkspaceSegment } from '../../shared/component/class-workspace-context-bar/class-workspace-context-bar.component';
import { SchoolClassService } from '../../service/school-class.service';

@Component({
  selector: 'app-class-workspace-page',
  templateUrl: './class-workspace-page.component.html',
  styleUrls: ['./class-workspace-page.component.scss']
})
export class ClassWorkspacePageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  classId: number | null = null;
  heading = '';
  workspaceSegment: ClassWorkspaceSegment = 'matieres';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schoolClassService: SchoolClassService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number(params.get('classId'));
      this.classId = Number.isFinite(id) && id > 0 ? id : null;
      this.refreshHeading();
    });

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.updateWorkspaceSegment());

    this.updateWorkspaceSegment();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateWorkspaceSegment(): void {
    const url = this.router.url.split('?')[0];
    if (url.includes('/planning')) {
      this.workspaceSegment = 'planning';
    } else if (url.includes('/periodes')) {
      this.workspaceSegment = 'periodes';
    } else {
      this.workspaceSegment = 'matieres';
    }
  }

  private refreshHeading(): void {
    this.heading = '';
    if (this.classId == null) {
      return;
    }
    this.schoolClassService.getById(this.classId).subscribe({
      next: (c) => {
        const lv = c.level?.name?.trim();
        this.heading = lv ? `${c.name} (${lv})` : c.name;
      },
      error: () => {
        this.heading = this.classId != null ? `Classe #${this.classId}` : '';
      }
    });
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subject, of, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { School } from '../../modules/admin/school/school-list/school-list.component';
import { ActiveSchoolService } from '../../service/active-school.service';
import { AuthService } from '../../service/auth.service';

/**
 * Accès limité : libellés locaux au montage ; polling pour détecter une réactivation (liste d’écoles non vide).
 */
@Component({
  selector: 'app-acces-indisponible-page',
  templateUrl: './acces-indisponible-page.component.html',
  styleUrls: ['./acces-indisponible-page.component.scss']
})
export class AccesIndisponiblePageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  /** Variante message : compte utilisateur désactivé vs aucune école accessible. */
  compteDesactive = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly activeSchool: ActiveSchoolService
  ) {}

  /** Libellé affiché depuis le JWT / stockage local (pas de GET /me). */
  get displayName(): string {
    return this.authService.getIdentitySnapshot().displayName;
  }

  ngOnInit(): void {
    this.applyRouteParams(this.route.snapshot.queryParamMap);
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((q) => this.applyRouteParams(q));
    this.startReactivationPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyRouteParams(q: ParamMap): void {
    this.compteDesactive =
      this.authService.isAccountDisabledSession() || q.get('raison') === 'compte';
  }

  /**
   * Vérifie périodiquement si l’admin a réactivé l’utilisateur (GET /schools avec au moins une école).
   * Accueil portail : {@code /dashboard} (la route {@code /} mène au login dans cette appli).
   */
  private startReactivationPolling(): void {
    if (!this.activeSchool.shouldLoadSchoolsForPicker()) {
      return;
    }
    timer(0, 15000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() =>
          this.activeSchool.refreshSchools$().pipe(catchError(() => of([] as School[])))
        )
      )
      .subscribe((schools) => {
        if (!this.activeSchool.shouldLoadSchoolsForPicker()) {
          return;
        }
        if (this.authService.isAccountDisabledSession()) {
          return;
        }
        if (schools.length > 0) {
          void this.router.navigateByUrl('/dashboard');
        }
      });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.activeSchool.clear();
        void this.router.navigateByUrl('/login');
      }
    });
  }
}

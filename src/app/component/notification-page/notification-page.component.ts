import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, timer } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { AuthService } from '../../service/auth.service';
import { InAppNotificationApiService, NotificationVm } from '../../service/in-app-notification-api.service';
import { School } from '../../modules/admin/school/school-list/school-list.component';
import { formatNotificationDateTime } from '../../shared/util/display-date.util';

@Component({
  selector: 'app-notification-page',
  templateUrl: './notification-page.component.html',
  styleUrls: ['./notification-page.component.scss']
})
export class NotificationPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  /** Bandeau : seule vue utile quand aucune école ou compte désactivé. */
  restrictionBanner: 'none' | 'compte' | 'sans-ecole' = 'none';

  loading = true;
  /** Échec réseau / HTTP hors 200 sur le chargement initial ou reload. */
  loadError = false;
  items: NotificationVm[] = [];
  actionAffiliationId: number | null = null;
  dismissingId: number | null = null;
  markAllBusy = false;

  constructor(
    private readonly notificationsApi: InAppNotificationApiService,
    private readonly authService: AuthService,
    private readonly activeSchool: ActiveSchoolService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.refreshRestrictionBanner();
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshRestrictionBanner());
    this.activeSchool.portalAccessBlocked$.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshRestrictionBanner());
    this.reload();
    this.startReactivationPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Au moins une carte affichée sans ligne « lu » (API read=false), indépendamment du compteur global. */
  get hasUnreadVisibleInList(): boolean {
    return !this.loading && this.items.some((n) => !n.read);
  }

  isInvitation(n: NotificationVm): boolean {
    return (n.type || '').toUpperCase() === 'INVITATION';
  }

  isUserTargeted(n: NotificationVm): boolean {
    return (n.type || '').toUpperCase() === 'USER_TARGETED';
  }

  invitationClosureNorm(n: NotificationVm): string {
    return (n.closureReason ?? '').trim().toUpperCase();
  }

  /** Invitation définitivement close (acceptée ou refusée). */
  isInvitationClosed(n: NotificationVm): boolean {
    const c = this.invitationClosureNorm(n);
    return c === 'INVITATION_ACCEPTED' || c === 'INVITATION_REFUSED';
  }

  formatCreatedAt(value: string | Date | undefined | null): string {
    return formatNotificationDateTime(value);
  }

  dismiss(n: NotificationVm): void {
    this.dismissingId = n.id;
    this.notificationsApi
      .dismissNotification(n.id)
      .pipe(
        finalize(() => {
          this.dismissingId = null;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.notificationsApi.bumpUnreadListeners();
          this.reload();
        },
        error: () => {
          this.snackBar.open('Impossible de masquer cette notification.', 'Fermer', {
            duration: 5000
          });
        }
      });
  }

  markAllRead(): void {
    if (!this.hasUnreadVisibleInList || this.markAllBusy) {
      return;
    }
    this.markAllBusy = true;
    this.notificationsApi
      .markAllRead()
      .pipe(
        switchMap((res) => {
          const n = typeof res?.markedCount === 'number' ? res.markedCount : 0;
          const msg =
            n === 0
              ? 'Aucune notification à marquer.'
              : `${n} notification${n > 1 ? 's' : ''} marquée${n > 1 ? 's' : ''} comme lue${n > 1 ? 's' : ''}.`;
          this.snackBar.open(msg, 'Fermer', { duration: 3500 });
          this.notificationsApi.bumpUnreadListeners();
          return this.notificationsApi.listNotifications(false);
        }),
        finalize(() => {
          this.markAllBusy = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (rows) => {
          this.items = rows || [];
        },
        error: () => {
          this.snackBar.open('Impossible de tout marquer comme lu.', 'Fermer', {
            duration: 5000
          });
        }
      });
  }

  canActOnInvitation(n: NotificationVm): boolean {
    return (
      this.isInvitation(n) &&
      !this.isInvitationClosed(n) &&
      n.linkId != null &&
      this.actionAffiliationId === null &&
      this.dismissingId === null
    );
  }

  accept(n: NotificationVm): void {
    if (n.linkId == null) {
      return;
    }
    this.actionAffiliationId = n.linkId;
    this.notificationsApi
      .acceptInvitationAffiliation(n.linkId)
      .pipe(
        switchMap((res) => {
          this.authService.saveTokens(res.bearer, res.refresh);
          return this.activeSchool.refreshSchools$();
        }),
        finalize(() => {
          this.actionAffiliationId = null;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Invitation acceptée. Vos droits ont été mis à jour.', 'Fermer', {
            duration: 4500
          });
          this.notificationsApi.bumpUnreadListeners();
          this.reload();
          this.refreshRestrictionBanner();
        },
        error: () => {
          this.snackBar.open(
            'Impossible d’accepter cette invitation pour le moment.',
            'Fermer',
            { duration: 6000 }
          );
        }
      });
  }

  refuse(n: NotificationVm): void {
    if (n.linkId == null) {
      return;
    }
    this.actionAffiliationId = n.linkId;
    this.notificationsApi
      .refuseInvitationAffiliation(n.linkId)
      .pipe(
        finalize(() => {
          this.actionAffiliationId = null;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Invitation refusée.', 'Fermer', { duration: 3500 });
          this.notificationsApi.bumpUnreadListeners();
          this.reload();
        },
        error: () => {
          this.snackBar.open('Impossible de refuser cette invitation.', 'Fermer', {
            duration: 6000
          });
        }
      });
  }

  private refreshRestrictionBanner(): void {
    if (
      this.authService.isAccountDisabledSession() ||
      this.route.snapshot.queryParamMap.get('raison') === 'compte'
    ) {
      this.restrictionBanner = 'compte';
      return;
    }
    if (this.activeSchool.isPortalAccessBlocked()) {
      this.restrictionBanner = 'sans-ecole';
      return;
    }
    this.restrictionBanner = 'none';
  }

  /**
   * Même logique que {@link AccesIndisponiblePageComponent} : détecter une réactivation admin via GET /schools.
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

  private reload(): void {
    this.loading = true;
    this.loadError = false;
    this.notificationsApi
      .listNotifications(false)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (rows) => {
          this.items = rows || [];
        },
        error: () => {
          this.items = [];
          this.loadError = true;
          this.snackBar.open('Impossible de charger les notifications.', 'Fermer', {
            duration: 5000
          });
        }
      });
  }
}

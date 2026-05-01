import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject as RxSubject, concatMap, forkJoin, from } from 'rxjs';
import { last, takeUntil } from 'rxjs/operators';
import { AppRoles } from '../../core/app-roles';
import { TimetableDragItem, TimetableEvaluationDto, TimetableViewDto } from '../../models/timetable.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { ClassSubjectService } from '../../service/class-subject.service';
import { ClassTimetableService } from '../../service/class-timetable.service';
import { resolveSchoolClassId } from '../../util/class-route.util';
import { evaluationOverlapsTimetableSlot } from '../../util/timetable-evaluation-cell.util';
import type { EvaluationType } from '../../models/evaluation.models';

@Component({
  selector: 'app-class-timetable-page',
  templateUrl: './class-timetable-page.component.html',
  styleUrls: ['./class-timetable-page.component.scss']
})
export class ClassTimetablePageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new RxSubject<void>();

  readonly days = [
    { dow: 1, label: 'Lundi' },
    { dow: 2, label: 'Mardi' },
    { dow: 3, label: 'Mercredi' },
    { dow: 4, label: 'Jeudi' },
    { dow: 5, label: 'Vendredi' }
  ];

  readonly slotDefs = Array.from({ length: 8 }, (_, i) => ({
    index: i,
    label: `${8 + i}h – ${9 + i}h`
  }));

  classId: number | null = null;
  workspaceChild = false;
  loading = true;
  syncing = false;

  /** Données CDK : une entrée max par créneau. */
  readonly cellArrays = new Map<string, TimetableDragItem[]>();
  paletteItems: TimetableDragItem[] = [];
  trashBin: TimetableDragItem[] = [];

  dropListIds: string[] = [];

  /** Évaluations dont l’intervalle chevauche la semaine du lundi courant. */
  weekEvaluations: TimetableEvaluationDto[] = [];
  weekStartLabel = '';
  private lastWeekStartIso: string | null = null;

  /** Clé `dayOfWeek-slotIndex` → évaluations affichées dans la cellule (début = créneau). */
  private readonly evaluationByCell = new Map<string, TimetableEvaluationDto[]>();

  /** Empêche de déposer un créneau dans la palette (réserve aux modèles). */
  readonly blockExternalDropIntoPalette = (drag: CdkDrag, _drop: CdkDropList): boolean =>
    drag.dropContainer.id === 'palette';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly timetableService: ClassTimetableService,
    private readonly classSubjectService: ClassSubjectService,
    private readonly authUtils: AuthUtilsService,
    private readonly snackBar: MatSnackBar
  ) {}

  get canEdit(): boolean {
    return this.authUtils.hasAnyRole([AppRoles.ADMIN_ECOLE, AppRoles.STAFF, AppRoles.DIRECTOR]);
  }

  cellEvaluations(dow: number, slotIndex: number): TimetableEvaluationDto[] {
    return this.evaluationByCell.get(this.key(dow, slotIndex)) ?? [];
  }

  evalCellClasses(dow: number, slotIndex: number): Record<string, boolean> {
    const list = this.cellEvaluations(dow, slotIndex);
    if (list.length === 0) {
      return {};
    }
    return {
      'slot-cell--has-eval': true,
      [`slot-cell--t-${list[0].type}`]: true
    };
  }

  shortEvalBadge(t: EvaluationType): string {
    switch (t) {
      case 'INTERROGATION':
        return '[INTERRO]';
      case 'DEVOIR':
        return '[DEV]';
      case 'COMPOSITION':
        return '[COMP]';
      case 'QUIZ':
        return '[QUIZ]';
      default:
        return '[ — ]';
    }
  }

  ngOnInit(): void {
    this.workspaceChild = !!this.route.snapshot.data['workspaceChild'];
    const param$ =
      this.workspaceChild && this.route.parent != null ? this.route.parent.paramMap : this.route.paramMap;
    param$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.classId = resolveSchoolClassId(this.route);
      if (this.classId == null) {
        this.loading = false;
        return;
      }
      this.initGridKeys();
      this.reload();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cellId(dow: number, slotIndex: number): string {
    return `cell-${dow}-${slotIndex}`;
  }

  cellData(dow: number, slotIndex: number): TimetableDragItem[] {
    const k = this.key(dow, slotIndex);
    if (!this.cellArrays.has(k)) {
      this.cellArrays.set(k, []);
    }
    return this.cellArrays.get(k)!;
  }

  onDrop(event: CdkDragDrop<TimetableDragItem[]>): void {
    if (!this.canEdit || this.classId == null) {
      return;
    }
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const destId = event.container.id;
    const srcId = event.previousContainer.id;

    if (destId === 'palette') {
      return;
    }

    if (destId === 'trash') {
      if (srcId === 'palette') {
        return;
      }
      const from = this.parseCellId(srcId);
      if (!from) {
        return;
      }
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0
      );
      this.trashBin.length = 0;
      this.persist([{ dayOfWeek: from.day, slotIndex: from.slot, classSubjectId: null }]);
      return;
    }

    const dest = this.parseCellId(destId);
    if (!dest) {
      return;
    }

    if (srcId === 'palette') {
      const paletteItem = event.previousContainer.data[event.previousIndex];
      const destArr = event.container.data;
      const clone = this.cloneDrag(paletteItem);
      if (destArr.length > 0) {
        destArr.splice(0, 1, clone);
      } else {
        destArr.push(clone);
      }
      this.persist([{ dayOfWeek: dest.day, slotIndex: dest.slot, classSubjectId: paletteItem.classSubjectId }]);
      return;
    }

    const src = this.parseCellId(srcId);
    if (!src) {
      return;
    }

    if (src.day === dest.day && src.slot === dest.slot) {
      return;
    }

    const destArr = event.container.data;
    const srcArr = event.previousContainer.data;
    const dragged = srcArr[event.previousIndex];

    if (destArr.length === 0) {
      transferArrayItem(srcArr, destArr, event.previousIndex, event.currentIndex);
      this.persist([
        { dayOfWeek: src.day, slotIndex: src.slot, classSubjectId: null },
        { dayOfWeek: dest.day, slotIndex: dest.slot, classSubjectId: dragged.classSubjectId }
      ]);
      return;
    }

    const bumped = destArr[0];
    destArr[0] = dragged;
    srcArr.splice(event.previousIndex, 1, bumped);
    this.persist([
      { dayOfWeek: src.day, slotIndex: src.slot, classSubjectId: bumped.classSubjectId },
      { dayOfWeek: dest.day, slotIndex: dest.slot, classSubjectId: dragged.classSubjectId }
    ]);
  }

  private persist(writes: { dayOfWeek: number; slotIndex: number; classSubjectId: number | null }[]): void {
    if (!this.classId || !writes.length) {
      return;
    }
    this.syncing = true;
    from(writes)
      .pipe(
        takeUntil(this.destroy$),
        concatMap((w) =>
          this.timetableService.setCell(this.classId!, {
            dayOfWeek: w.dayOfWeek,
            slotIndex: w.slotIndex,
            classSubjectId: w.classSubjectId
          })
        ),
        last()
      )
      .subscribe({
        next: (view) => {
          this.applyServerView(view);
          this.refreshWeekEvaluationsFromApi();
          this.syncing = false;
        },
        error: () => {
          this.syncing = false;
          this.snackBar.open('Enregistrement impossible.', 'Fermer', { duration: 5000 });
          this.reload();
        }
      });
  }

  private reload(): void {
    if (this.classId == null) {
      return;
    }
    this.loading = true;
    const weekStart = this.mondayIsoInWeek(new Date());
    this.lastWeekStartIso = weekStart;
    this.weekStartLabel = this.formatFrenchDate(weekStart);
    forkJoin({
      timetable: this.timetableService.getTimetable(this.classId, {
        weekStart,
        includeEvaluations: true
      }),
      subjects: this.classSubjectService.listForClass(this.classId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ timetable, subjects }) => {
          this.paletteItems = subjects.map((s) => ({
            classSubjectId: s.id,
            subjectCode: s.subjectCode,
            subjectName: s.subjectName,
            teacherFullname: s.teacherFullname
          }));
          this.weekEvaluations = timetable.evaluations ?? [];
          this.rebuildEvaluationCellMap();
          this.applyServerView(timetable);
          this.rebuildDropListIds();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Impossible de charger l’emploi du temps.', 'Fermer', { duration: 5000 });
        }
      });
  }

  private initGridKeys(): void {
    this.cellArrays.clear();
    for (const d of this.days) {
      for (const s of this.slotDefs) {
        this.cellArrays.set(this.key(d.dow, s.index), []);
      }
    }
  }

  private rebuildDropListIds(): void {
    const ids = ['palette', 'trash'];
    for (const d of this.days) {
      for (const s of this.slotDefs) {
        ids.push(this.cellId(d.dow, s.index));
      }
    }
    this.dropListIds = ids;
  }

  private applyServerView(view: TimetableViewDto): void {
    this.initGridKeys();
    for (const sl of view.slots) {
      const arr = this.cellData(sl.dayOfWeek, sl.slotIndex);
      arr.push({
        classSubjectId: sl.classSubjectId,
        subjectCode: sl.subjectCode,
        subjectName: sl.subjectName,
        teacherFullname: sl.teacherFullname ?? null
      });
    }
  }

  /** Lundi (ISO) de la semaine calendaire contenant `d` (lundi = premier jour de la semaine affichée). */
  private mondayIsoInWeek(d: Date): string {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
    const y = mon.getFullYear();
    const m = String(mon.getMonth() + 1).padStart(2, '0');
    const daynum = String(mon.getDate()).padStart(2, '0');
    return `${y}-${m}-${daynum}`;
  }

  /** Le PUT d’une cellule renvoie l’EDT sans overlay évaluations : on rechargement léger. */
  private refreshWeekEvaluationsFromApi(): void {
    if (this.classId == null || this.lastWeekStartIso == null) {
      return;
    }
    this.timetableService
      .getTimetable(this.classId, { weekStart: this.lastWeekStartIso, includeEvaluations: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        this.weekEvaluations = v.evaluations ?? [];
        this.rebuildEvaluationCellMap();
      });
  }

  private rebuildEvaluationCellMap(): void {
    this.evaluationByCell.clear();
    const monday = this.lastWeekStartIso;
    if (monday == null) {
      return;
    }
    for (const e of this.weekEvaluations) {
      for (const d of this.days) {
        for (const s of this.slotDefs) {
          if (!evaluationOverlapsTimetableSlot(e.startDate, e.endDate, monday, d.dow, s.index)) {
            continue;
          }
          const k = this.key(d.dow, s.index);
          const arr = this.evaluationByCell.get(k) ?? [];
          if (!arr.some((x) => x.id === e.id)) {
            arr.push(e);
          }
          this.evaluationByCell.set(k, arr);
        }
      }
    }
  }

  private formatFrenchDate(isoDate: string): string {
    const [y, m, day] = isoDate.split('-').map((x) => Number(x));
    if (!y || !m || !day) {
      return isoDate;
    }
    return new Date(y, m - 1, day).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  private key(dow: number, slot: number): string {
    return `${dow}-${slot}`;
  }

  private parseCellId(id: string): { day: number; slot: number } | null {
    const m = /^cell-(\d+)-(\d+)$/.exec(id);
    if (!m) {
      return null;
    }
    return { day: Number(m[1]), slot: Number(m[2]) };
  }

  private cloneDrag(i: TimetableDragItem): TimetableDragItem {
    return { ...i };
  }
}

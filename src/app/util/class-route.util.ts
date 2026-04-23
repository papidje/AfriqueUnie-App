import { ActivatedRoute } from '@angular/router';

/** Récupère `classId` depuis la route courante ou un parent (routes imbriquées `classes/:classId/...`). */
export function resolveSchoolClassId(route: ActivatedRoute): number | null {
  let current: ActivatedRoute | null = route;
  while (current) {
    const raw = current.snapshot.paramMap.get('classId');
    if (raw != null && raw !== '') {
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    current = current.parent;
  }
  return null;
}

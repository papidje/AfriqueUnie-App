import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Action affichée dans l'en-tête d'un hub (ex. « Nouvelle évaluation »). */
export interface HubHeaderAction {
  label: string;
  icon?: string;
  disabled?: boolean;
  run: () => void;
}

/**
 * Permet à une page enfant (rendue via `<router-outlet>`) de publier une action
 * qui sera affichée dans l'en-tête du parent (chrome partagé). Coordination
 * purement présentationnelle, sans logique métier.
 */
@Injectable({ providedIn: 'root' })
export class HubHeaderActionService {
  private readonly actionSubject = new BehaviorSubject<HubHeaderAction | null>(null);
  readonly action$ = this.actionSubject.asObservable();

  set(action: HubHeaderAction): void {
    this.actionSubject.next(action);
  }

  clear(): void {
    this.actionSubject.next(null);
  }
}

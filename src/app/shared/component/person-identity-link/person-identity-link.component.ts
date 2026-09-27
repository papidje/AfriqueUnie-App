import { Component, Input } from '@angular/core';

/** Civilité élève ou rôle parent pour l’icône. */
export type PersonGenderKind = 'boy' | 'girl' | 'neutral';

@Component({
  selector: 'app-person-identity-link',
  templateUrl: './person-identity-link.component.html',
  styleUrls: ['./person-identity-link.component.scss']
})
export class PersonIdentityLinkComponent {
  /** Lien router (ex. `/students/12`). */
  @Input() link: string | any[] | null = null;
  @Input() lastName = '';
  @Input() firstName = '';
  /** Si fourni, affiché tel quel à la place de nom+prénom. */
  @Input() label: string | null = null;
  /**
   * `MONSIEUR` / `MADAME` (élève) ou `PERE` / `MERE` / `PERE_ET_MERE` (parent).
   */
  @Input() civilityOrRole: string | null | undefined;

  get displayName(): string {
    if (this.label?.trim()) {
      return this.label.trim();
    }
    return `${this.lastName || ''} ${this.firstName || ''}`.trim() || '—';
  }

  get kind(): PersonGenderKind {
    const v = (this.civilityOrRole || '').trim().toUpperCase();
    if (v === 'MADAME' || v === 'MERE' || v === 'F' || v === 'FEMALE') {
      return 'girl';
    }
    if (v === 'MONSIEUR' || v === 'PERE' || v === 'M' || v === 'MALE') {
      return 'boy';
    }
    if (v === 'PERE_ET_MERE') {
      return 'neutral';
    }
    return 'neutral';
  }

  get icon(): string {
    switch (this.kind) {
      case 'girl':
        return 'woman';
      case 'boy':
        return 'man';
      default:
        return 'person';
    }
  }
}

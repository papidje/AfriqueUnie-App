import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-karanso-brand',
  templateUrl: './karanso-brand.component.html',
  styleUrls: ['./karanso-brand.component.scss']
})
export class KaransoBrandComponent {
  /** Variantes d’affichage selon le contexte (topbar, auth, marketing, hero). */
  @Input() variant: 'header' | 'auth' | 'marketing' | 'hero' = 'auth';

  /** Affiche le slogan sous le nom (défaut : oui sauf header compact). */
  @Input() showTagline: boolean | null = null;

  get displayTagline(): boolean {
    if (this.showTagline !== null) {
      return this.showTagline;
    }
    return this.variant !== 'header';
  }

  get markWidth(): number {
    switch (this.variant) {
      case 'hero':
        return 160;
      case 'header':
        return 48;
      case 'marketing':
        return 56;
      default:
        return 96;
    }
  }

  get markHeight(): number {
    switch (this.variant) {
      case 'hero':
        return 140;
      case 'header':
        return 40;
      case 'marketing':
        return 48;
      default:
        return 84;
    }
  }
}

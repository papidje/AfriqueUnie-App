import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-karanso-brand',
  templateUrl: './karanso-brand.component.html',
  styleUrls: ['./karanso-brand.component.scss']
})
export class KaransoBrandComponent {
  /** Variantes d’affichage selon le contexte (topbar, auth, marketing, hero). */
  @Input() variant: 'header' | 'auth' | 'marketing' | 'hero' = 'auth';
}

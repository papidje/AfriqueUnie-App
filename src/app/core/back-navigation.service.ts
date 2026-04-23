import { Location } from '@angular/common';
import { Injectable } from '@angular/core';

/**
 * Retour « navigateur » dans l’historique, sans route fixe.
 * À réutiliser sur la fiche parent (élève, future recherche combinée nom/prénom/email/téléphone, etc.)
 * pour que le bouton Retour ramène toujours à l’écran d’où l’utilisateur est venu.
 */
@Injectable({ providedIn: 'root' })
export class BackNavigationService {
  constructor(private readonly location: Location) {}

  goBackInHistory(): void {
    this.location.back();
  }
}

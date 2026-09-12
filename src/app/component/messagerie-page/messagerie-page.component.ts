import { Component } from '@angular/core';
import { AuthService } from '../../service/auth.service';

/**
 * Messagerie in-app (placeholder) — contenu métier à venir.
 * Accessible même lorsque l’organisation (tenant) est désactivée.
 */
@Component({
  selector: 'app-messagerie-page',
  templateUrl: './messagerie-page.component.html',
  styleUrls: ['./messagerie-page.component.scss']
})
export class MessageriePageComponent {
  constructor(private readonly authService: AuthService) {}

  get tenantDesactive(): boolean {
    return this.authService.isTenantDisabledSession();
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-api-unavailable',
  templateUrl: './api-unavailable.component.html',
  styleUrls: ['./api-unavailable.component.scss']
})
export class ApiUnavailableComponent {
  @Input() title = 'Service indisponible';
  @Input() message = 'Impossible de charger les donnees pour le moment.';
  @Output() retry = new EventEmitter<void>();

  onRetry(): void {
    this.retry.emit();
  }
}

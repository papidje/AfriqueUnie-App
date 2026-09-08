import { Component } from '@angular/core';

@Component({
  selector: 'app-marketing-layout',
  templateUrl: './marketing-layout.component.html',
  styleUrls: ['./marketing-layout.component.scss']
})
export class MarketingLayoutComponent {
  readonly year = new Date().getFullYear();
  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}

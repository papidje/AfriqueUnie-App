import { Component } from '@angular/core';
import {AuthService} from "../../service/auth.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  users: any;

  constructor(
    private service: AuthService
  ) {
    this.service.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      }
    })
  }
}

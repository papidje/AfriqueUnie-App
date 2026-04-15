import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../service/auth.service";
import {UserService} from "../../service/user.service";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit{
  user: any;

  constructor(
    private service: UserService
  ) {
  }

  ngOnInit(): void {
    this.service.getUserInfo().subscribe({
      next: (user) => {
        this.user = user;
      }
    });
  }

  editProfile() {

  }
}

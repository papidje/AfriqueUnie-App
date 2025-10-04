import { Component } from '@angular/core';
import {BackendService} from "./service/backend.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'AfriqueUnieApp';
  posts: any;

  constructor(
    backendService: BackendService
  ) {
  backendService.getData('posts').subscribe(data => {
    this.posts = data;
  })
  }
}

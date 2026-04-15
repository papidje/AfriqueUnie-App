import {Injectable} from '@angular/core';
import {CanActivate, CanActivateChild, Router,} from '@angular/router';
import {AuthUtilsService} from "../service/auth-utils.service";

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private router: Router, private authUtils: AuthUtilsService
  ) {
  }

  canActivate() {
    return this.checkToken();
  }

  canActivateChild() {
    return this.checkToken();
  }


  private checkToken(): boolean {
    if (this.authUtils.isAuthenticated()) {
      return true;
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }

}

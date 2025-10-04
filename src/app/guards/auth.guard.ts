import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import { Observable } from 'rxjs';
import {jwtDecode} from "jwt-decode";

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router
  ) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const token = localStorage.getItem('jwt');
    if (token) {
      // Optionnel : tu peux vérifier la validité du token ici
      console.log(jwtDecode(token))
      return true;
    } else {
      // Non connecté, redirige vers login
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
  }

}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {LoginComponent} from "./component/login/login.component";
import {RegisterComponent} from "./component/register/register.component";
import {ActivateComponent} from "./component/activate/activate.component";
import {HomeComponent} from "./component/home/home.component";
import {AuthGuard} from "./guards/auth.guard";

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'activate', component: ActivateComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  // autres routes à venir...
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

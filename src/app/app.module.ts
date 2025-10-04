import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {HTTP_INTERCEPTORS, HttpClientModule} from "@angular/common/http";
import { LoginComponent } from './component/login/login.component';
import { RegisterComponent } from './component/register/register.component';
import {ReactiveFormsModule} from "@angular/forms";
import { ActivateComponent } from './component/activate/activate.component';
import { HomeComponent } from './component/home/home.component';
import {AuthInterceptor} from "./interceptors/auth.interceptor";

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    ActivateComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

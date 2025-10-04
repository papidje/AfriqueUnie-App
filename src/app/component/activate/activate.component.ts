import { Component } from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {AuthService} from "../../service/auth.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-activate',
  templateUrl: './activate.component.html',
  styleUrls: ['./activate.component.scss']
})
export class ActivateComponent {
  activateForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.activateForm = this.fb.group({
      userMail: ['', [Validators.required, Validators.email]],
      code: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.activateForm.valid) {
      this.authService.activate(this.activateForm.value).subscribe({
        next: (res) => {
          console.log('Activate successful', res);
          // Stocker token, rediriger vers dashboard...
          this.router.navigate(['/login']);
        },
        error: (err) => console.error('Login failed', err)
      });
    }
  }
}

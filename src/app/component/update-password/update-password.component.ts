import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {AuthService} from "../../service/auth.service";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-update-password',
  templateUrl: './update-password.component.html',
  styleUrls: ['./update-password.component.scss']
})
export class UpdatePasswordComponent implements OnInit {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: ['', [Validators.required]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const email = (params.get('email') ?? '').trim();
      const code = (params.get('code') ?? '').trim();
      const patch: { email?: string; code?: string } = {};
      if (email) {
        patch.email = email;
      }
      if (code) {
        patch.code = code;
      }
      if (Object.keys(patch).length > 0) {
        this.form.patchValue(patch);
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.authService.newPassword(this.form.value).subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: (err) => console.error('New password failed', err)
      });
    }
  }

}

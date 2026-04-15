import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SchoolService } from '../school.service';

@Component({
  selector: 'app-school-form',
  templateUrl: './school-form.component.html',
  styleUrls: ['./school-form.component.scss']
})
export class SchoolFormComponent {
  form: FormGroup;
  isEditMode: boolean = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private service: SchoolService,
    private dialogRef: MatDialogRef<SchoolFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.id;
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      address: [data?.address || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      phone: [data?.phone || '', Validators.required],
      description: [data?.description || '']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    const payload = this.form.value;

    const request = this.isEditMode
      ? this.service.update(this.data.id, payload)
      : this.service.create(payload);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

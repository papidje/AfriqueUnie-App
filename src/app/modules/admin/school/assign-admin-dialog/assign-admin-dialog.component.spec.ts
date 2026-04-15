import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignAdminDialogComponent } from './assign-admin-dialog.component';

describe('AssignAdminDialogComponent', () => {
  let component: AssignAdminDialogComponent;
  let fixture: ComponentFixture<AssignAdminDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignAdminDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignAdminDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

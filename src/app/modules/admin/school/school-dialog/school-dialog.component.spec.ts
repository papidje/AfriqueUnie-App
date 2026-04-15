import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolDialogComponent } from './school-dialog.component';

describe('SchoolDialogComponent', () => {
  let component: SchoolDialogComponent;
  let fixture: ComponentFixture<SchoolDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SchoolDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

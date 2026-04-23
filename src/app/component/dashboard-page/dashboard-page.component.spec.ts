import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { DashboardPageComponent } from './dashboard-page.component';
import { DashboardService } from '../../service/dashboard.service';
import { ActiveSchoolService } from '../../service/active-school.service';

describe('DashboardPageComponent', () => {
  let component: DashboardPageComponent;
  let fixture: ComponentFixture<DashboardPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardPageComponent],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getSummary: () =>
              of({
                studentsEnrolled: 80,
                totalCapacity: 120,
                classesCount: 4,
                taughtSubjectsCount: 32,
                monthlyTuitionCollected: 500000,
                schoolYearTuitionCollected: 4_000_000,
                recentEnrollments: []
              })
          }
        },
        {
          provide: ActiveSchoolService,
          useValue: {
            refreshSchools$: () => of([]),
            activeSchoolId$: new BehaviorSubject<number | null>(null).asObservable(),
            headerVm$: of({ showPicker: false, schools: [], selectedId: null }),
            getActiveSchoolId: () => null
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

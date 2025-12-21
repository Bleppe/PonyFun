import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RaceAnalysis } from './race-analysis';

describe('RaceAnalysis', () => {
  let component: RaceAnalysis;
  let fixture: ComponentFixture<RaceAnalysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaceAnalysis]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RaceAnalysis);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

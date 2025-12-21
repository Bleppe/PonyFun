import { TestBed } from '@angular/core/testing';

import { Race } from './race';

describe('Race', () => {
  let service: Race;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Race);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

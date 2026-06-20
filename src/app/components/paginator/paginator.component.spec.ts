import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatPaginatorModule } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  let component: PaginatorComponent;
  let fixture: ComponentFixture<PaginatorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatPaginatorModule, NoopAnimationsModule],
      declarations: [PaginatorComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
    component.total = 0;
    component.limit = 10;
    component.offset = 0;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('emits {limit, offset: 0} on page-size change and persists to localStorage when storageKey set', () => {
    const emitted: any[] = [];
    component.pageChange.subscribe(e => emitted.push(e));
    component.storageKey = 'test_page_size';

    // Simulate MatPaginator's PageEvent — user changes page size from 10 to 25.
    // When the page size changes, MatPaginator emits the new pageSize along with
    // the previous pageIndex (because we reset to first page in our handler).
    component.onPageChange({ previousPageIndex: 0, pageIndex: 0, pageSize: 25, length: 100 } as any);

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ limit: 25, offset: 0 });
    expect(localStorage.getItem('test_page_size')).toBe('25');
  });

  it('emits correct offset on page navigation (same page size)', () => {
    const emitted: any[] = [];
    component.pageChange.subscribe(e => emitted.push(e));

    // User navigates to page 3 (0-indexed) — size unchanged from initial 10.
    component.onPageChange({ previousPageIndex: 2, pageIndex: 3, pageSize: 10, length: 100 } as any);

    expect(emitted[0]).toEqual({ limit: 10, offset: 30 });
  });

  it('does not touch localStorage when storageKey absent', () => {
    localStorage.clear();
    component.onPageChange({ previousPageIndex: 0, pageIndex: 0, pageSize: 50, length: 0 } as any);
    expect(localStorage.length).toBe(0);
  });

  it('computes pageIndex from offset/limit', () => {
    component.limit = 25;
    component.offset = 50;
    expect(component.pageIndex).toBe(2);
  });

  afterEach(() => localStorage.clear());
});

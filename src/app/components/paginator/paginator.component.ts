import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

@Component({
    selector: 'app-paginator',
    templateUrl: './paginator.component.html',
    styleUrls: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class PaginatorComponent {
  @Input() total = 0;
  @Input() limit = 10;
  @Input() offset = 0;
  @Input() storageKey?: string;
  @Output() pageChange = new EventEmitter<{ limit: number; offset: number }>();

  readonly options: number[] = [10, 25, 50, 100];

  get pageIndex(): number {
    return Math.floor(this.offset / Math.max(1, this.limit));
  }

  /**
   * Handle MatPaginator PageEvent. When the page size changes, reset offset to 0
   * (first page). Otherwise advance offset to pageIndex * pageSize. Persists
   * page size to localStorage when storageKey is set.
   */
  onPageChange(event: PageEvent): void {
    const sizeChanged = event.pageSize !== this.limit;
    this.limit = event.pageSize;
    this.offset = sizeChanged ? 0 : event.pageIndex * event.pageSize;
    if (this.storageKey) {
      localStorage.setItem(this.storageKey, String(this.limit));
    }
    this.pageChange.emit({ limit: this.limit, offset: this.offset });
  }
}

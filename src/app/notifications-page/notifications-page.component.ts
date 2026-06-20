import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { PostsService } from 'app/posts.services';
import { Notification, NotificationType } from 'api-types';
import { MatChipListboxChange } from '@angular/material/chips';
import { NotificationActionsService } from './notification-actions.service';
import { NotificationAction } from 'api-types/models/NotificationAction';

@Component({
    selector: 'app-notifications-page',
    templateUrl: './notifications-page.component.html',
    styleUrls: ['./notifications-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class NotificationsPageComponent implements OnInit {

  items: Notification[] = [];
  total = 0;
  limit = 10;
  offset = 0;
  selectedFilters: NotificationType[] = [];

  readonly pageSizeStorageKey = 'notifications_page_size';

  notificationFilters: { [key in NotificationType]: { key: string; label: string } } = {
    download_complete: { key: 'download_complete', label: $localize`Download completed` },
    download_error:    { key: 'download_error',    label: $localize`Download error` },
    task_finished:     { key: 'task_finished',     label: $localize`Task` },
  };

  constructor(public postsService: PostsService, private actions: NotificationActionsService) {}

  ngOnInit(): void {
    const saved = Number(localStorage.getItem(this.pageSizeStorageKey));
    if ([10, 25, 50, 100].includes(saved)) {
      this.limit = saved;
    }
    this.fetch();
  }

  fetch(): void {
    this.postsService.getNotificationsPaginated({
      limit: this.limit,
      offset: this.offset,
      types: this.selectedFilters
    }).subscribe(res => {
      this.items = res.items;
      this.total = res.total;
    });
  }

  onPageChange(event: { limit: number; offset: number }): void {
    this.limit = event.limit;
    this.offset = event.offset;
    this.fetch();
  }

  onFilterChange(event: MatChipListboxChange): void {
    this.selectedFilters = event.value;
    this.offset = 0;
    this.fetch();
  }

  notificationAction(event: { notification: Notification; action: NotificationAction }): void {
    this.actions.run(event);
  }

  /**
   * Delete one notification: optimistic UI update. If we just deleted the last
   * item on a non-first page, step back one page (so the user doesn't see an
   * empty list with a paginator pointing past the end).
   */
  deleteNotification(uid: string): void {
    this.postsService.deleteNotification(uid).subscribe(() => {
      this.items = this.items.filter(n => n.uid !== uid);
      this.total = Math.max(0, this.total - 1);
      if (this.items.length === 0 && this.offset > 0 && this.total > 0) {
        this.offset = Math.max(0, this.offset - this.limit);
        this.fetch();
      }
    });
  }

  deleteAll(): void {
    this.postsService.deleteAllNotifications().subscribe(() => {
      this.items = [];
      this.total = 0;
      this.offset = 0;
    });
  }

  markAllRead(): void {
    this.postsService.setNotificationsToRead([]).subscribe(() => {
      this.fetch();
    });
  }

  originalOrder = (): number => 0;
}

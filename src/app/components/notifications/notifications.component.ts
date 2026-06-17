import { Component, ElementRef, EventEmitter, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { PostsService } from 'app/posts.services';
import { Notification, NotificationType } from 'api-types';
import { MatChipListboxChange } from '@angular/material/chips';
import { filter, take } from 'rxjs/operators';
import { NotificationActionsService } from 'app/notifications-page/notification-actions.service';

@Component({
    selector: 'app-notifications',
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class NotificationsComponent implements OnInit {

  notifications: Notification[] = null;
  filtered_notifications: Notification[] = null;
  unread_total = 0;
  list_height = '65vh';

  // Kept for backwards compatibility with app.component.html template binding.
  // AppComponent renders `9+` past 9 unread via notificationBadgeValue() in Task 11.
  // Emits the raw unread total; rendering layer formats it.
  @Output() notificationCount = new EventEmitter<number>();

  notificationFilters: { [key in NotificationType]: { key: string; label: string } } = {
    download_complete: { key: 'download_complete', label: $localize`Download completed` },
    download_error:    { key: 'download_error',    label: $localize`Download error` },
    task_finished:     { key: 'task_finished',     label: $localize`Task` },
  };

  selectedFilters: NotificationType[] = [];

  constructor(
    public postsService: PostsService,
    private router: Router,
    private elRef: ElementRef,
    private actions: NotificationActionsService
  ) {}

  ngOnInit(): void {
    if (this.postsService.initialized) {
      this.getNotifications();
    } else {
      this.postsService.service_initialized
        .pipe(filter(Boolean), take(1))
        .subscribe(() => this.getNotifications());
    }
  }

  /**
   * Fetch up to 10 unread notifications (bell cap). Server returns total unread
   * count separately — we emit it via notificationCount so AppComponent can
   * render the badge. Filter chips re-trigger this with the chosen types.
   */
  getNotifications(): void {
    this.postsService.getNotificationsPaginated({
      limit: 10,
      offset: 0,
      unread_only: true,
      types: this.selectedFilters
    }).subscribe(res => {
      this.notifications = res.items;
      this.unread_total = res.total;
      this.filtered_notifications = res.items;
      this.notificationCount.emit(res.total);
      this.calculateListHeight();
    });
  }

  notificationAction(event: { notification: Notification; action: any }): void {
    this.actions.run(event);
  }

  deleteNotification(uid: string): void {
    this.postsService.deleteNotification(uid).subscribe(() => {
      if (!this.notifications) return;
      this.notifications = this.notifications.filter(n => n.uid !== uid);
      this.filtered_notifications = this.notifications;
      this.unread_total = Math.max(0, this.unread_total - 1);
      this.notificationCount.emit(this.unread_total);
      this.calculateListHeight();
    });
  }

  deleteAllNotifications(): void {
    this.postsService.deleteAllNotifications().subscribe(() => {
      this.notifications = [];
      this.filtered_notifications = [];
      this.unread_total = 0;
      this.notificationCount.emit(0);
    });
  }

  /**
   * Marks all of the user's notifications as read on the server. The endpoint
   * updates every notification for this user (not just the loaded 10) — so the
   * unread count drops to 0 client-side too.
   */
  setNotificationsToRead(): void {
    this.postsService.setNotificationsToRead([]).subscribe(() => {
      this.unread_total = 0;
      this.notificationCount.emit(0);
    });
  }

  filterNotifications(): void {
    // Re-fetch with the new type filter applied server-side.
    this.getNotifications();
  }

  selectedFiltersChanged(event: MatChipListboxChange): void {
    this.selectedFilters = event.value;
    this.filterNotifications();
  }

  viewAll(): void {
    this.router.navigate(['/notifications']);
  }

  calculateListHeight(): void {
    const avgHeight = 166;
    const count = this.filtered_notifications?.length ?? 0;
    const calcHeight = count * avgHeight;
    this.list_height = calcHeight > window.innerHeight * 0.65 ? '65vh' : `${calcHeight}px`;
  }

  originalOrder = (): number => 0;
}

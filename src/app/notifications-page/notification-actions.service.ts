import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PostsService } from 'app/posts.services';
import { Notification, NotificationAction } from 'api-types';

export interface NotificationActionEvent {
  notification: Notification;
  action: NotificationAction;
}

@Injectable({ providedIn: 'root' })
export class NotificationActionsService {
  constructor(private posts: PostsService, private router: Router) {}

  /**
   * Runs the given action against the given notification. Shared between the
   * bell-panel NotificationsComponent and the NotificationsPageComponent so
   * behavior stays identical. On unknown action, logs and does nothing — no
   * throw, because actions come from server data and a bad enum value
   * shouldn't crash the UI.
   */
  run(event: NotificationActionEvent): void {
    const { notification, action } = event;
    switch (action) {
      case NotificationAction.PLAY:
        this.router.navigate(['player', { uid: notification.data?.file_uid }]);
        break;
      case NotificationAction.VIEW_DOWNLOAD_ERROR:
        this.router.navigate(['downloads']);
        break;
      case NotificationAction.RETRY_DOWNLOAD:
        this.posts.restartDownload(notification.data?.download_uid).subscribe(() => {
          this.posts.openSnackBar($localize`Download restarted!`);
          this.posts.deleteNotification(notification.uid).subscribe();
        });
        break;
      case NotificationAction.VIEW_TASKS:
        this.router.navigate(['tasks']);
        break;
      default:
        // Unknown action: log and skip. No throw — bad enum values from server
        // data shouldn't crash the UI. Documented fallback per code-review
        // guardrail (a): log + skip.
        console.error(`Notification action ${action} does not exist!`);
    }
  }
}

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { NotificationActionsService } from './notification-actions.service';
import { PostsService } from 'app/posts.services';
import { Notification, NotificationAction } from 'api-types';

class MockPostsService {
  restartDownload = jasmine.createSpy().and.returnValue(of({}));
  openSnackBar = jasmine.createSpy();
  deleteNotification = jasmine.createSpy().and.returnValue(of({}));
}

class MockRouter {
  navigate = jasmine.createSpy();
}

describe('NotificationActionsService', () => {
  let service: NotificationActionsService;
  let posts: MockPostsService;
  let router: MockRouter;

  beforeEach(() => {
    posts = new MockPostsService();
    router = new MockRouter();
    TestBed.configureTestingModule({
      providers: [
        NotificationActionsService,
        { provide: PostsService, useValue: posts },
        { provide: Router, useValue: router }
      ]
    });
    service = TestBed.inject(NotificationActionsService);
  });

  const notif = (overrides: Partial<Notification> = {}): Notification => ({
    uid: 'n1',
    type: 'download_complete',
    text: '',
    read: false,
    timestamp: 0,
    data: {},
    actions: [],
    ...overrides
  } as Notification);

  it('PLAY routes to player with file_uid', () => {
    service.run({ notification: notif({ data: { file_uid: 'f1' } }), action: NotificationAction.PLAY });
    expect(router.navigate).toHaveBeenCalledWith(['player', { uid: 'f1' }]);
  });

  it('VIEW_DOWNLOAD_ERROR routes to /downloads', () => {
    service.run({ notification: notif(), action: NotificationAction.VIEW_DOWNLOAD_ERROR });
    expect(router.navigate).toHaveBeenCalledWith(['downloads']);
  });

  it('VIEW_TASKS routes to /tasks', () => {
    service.run({ notification: notif(), action: NotificationAction.VIEW_TASKS });
    expect(router.navigate).toHaveBeenCalledWith(['tasks']);
  });

  it('RETRY_DOWNLOAD calls restartDownload and deletes the notification', () => {
    service.run({ notification: notif({ data: { download_uid: 'd1' } }), action: NotificationAction.RETRY_DOWNLOAD });
    expect(posts.restartDownload).toHaveBeenCalledWith('d1');
    // restartDownload's observable is synchronous (of({})); subscribe fires immediately.
    expect(posts.openSnackBar).toHaveBeenCalled();
    expect(posts.deleteNotification).toHaveBeenCalledWith('n1');
  });

  it('unknown action logs error and does nothing else', () => {
    spyOn(console, 'error');
    service.run({ notification: notif(), action: 'bogus' as NotificationAction });
    expect(console.error).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(posts.restartDownload).not.toHaveBeenCalled();
  });
});

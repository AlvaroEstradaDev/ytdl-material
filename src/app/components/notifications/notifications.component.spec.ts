import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { NotificationsComponent } from './notifications.component';
import { PostsService } from 'app/posts.services';
import { NotificationActionsService } from 'app/notifications-page/notification-actions.service';

class MockPostsService {
  initialized = true;
  service_initialized = of(true);
  getNotificationsPaginated = jasmine.createSpy().and.returnValue(of({ items: [], total: 0, unread_total: 0, limit: 10, offset: 0 }));
  deleteNotification = jasmine.createSpy().and.returnValue(of({}));
  deleteAllNotifications = jasmine.createSpy().and.returnValue(of({}));
}

class MockRouter {
  navigate = jasmine.createSpy();
}

class MockActions {
  run = jasmine.createSpy();
}

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [NotificationsComponent],
      providers: [
        { provide: PostsService, useValue: new MockPostsService() },
        { provide: Router, useValue: new MockRouter() },
        { provide: NotificationActionsService, useValue: new MockActions() }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits notificationCount with unread_total from paginated response', () => {
    // Use a non-zero mock so the assertion can distinguish real propagation
    // from a hardcoded 0 (the failure mode the original test hid).
    const posts = TestBed.inject(PostsService) as any as MockPostsService;
    posts.getNotificationsPaginated.and.returnValue(
      of({ items: [], total: 99, unread_total: 7, limit: 10, offset: 0 })
    );
    const emitted: number[] = [];
    component.notificationCount.subscribe(n => emitted.push(n));
    component.getNotifications();
    expect(emitted).toContain(7);
    expect(emitted).not.toContain(99);
  });

  it('sends paginated request without unread_only (bell shows last 10 regardless of read state)', () => {
    const posts = TestBed.inject(PostsService) as any as MockPostsService;
    posts.getNotificationsPaginated.calls.reset();
    component.getNotifications();
    expect(posts.getNotificationsPaginated).toHaveBeenCalled();
    const args = posts.getNotificationsPaginated.calls.mostRecent().args[0];
    expect(args.unread_only).toBeUndefined();
    expect(args.unreadOnly).toBeUndefined();
    expect(args).toEqual({ limit: 10, offset: 0, types: [] });
  });

  it('viewAll navigates to /notifications', () => {
    const router = TestBed.inject(Router) as any;
    component.viewAll();
    expect(router.navigate).toHaveBeenCalledWith(['/notifications']);
  });
});

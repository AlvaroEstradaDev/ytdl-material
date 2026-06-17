import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { NotificationsComponent } from './notifications.component';
import { PostsService } from 'app/posts.services';
import { NotificationActionsService } from 'app/notifications-page/notification-actions.service';

class MockPostsService {
  initialized = true;
  service_initialized = of(true);
  getNotificationsPaginated = jasmine.createSpy().and.returnValue(of({ items: [], total: 0, limit: 10, offset: 0 }));
  deleteNotification = jasmine.createSpy().and.returnValue(of({}));
  deleteAllNotifications = jasmine.createSpy().and.returnValue(of({}));
  setNotificationsToRead = jasmine.createSpy().and.returnValue(of({}));
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

  it('emits notificationCount with total from paginated response', () => {
    const emitted: number[] = [];
    component.notificationCount.subscribe(n => emitted.push(n));
    component.getNotifications();
    // mock returns total: 0 synchronously
    expect(emitted).toContain(0);
  });

  it('viewAll navigates to /notifications', () => {
    const router = TestBed.inject(Router) as any;
    component.viewAll();
    expect(router.navigate).toHaveBeenCalledWith(['/notifications']);
  });
});

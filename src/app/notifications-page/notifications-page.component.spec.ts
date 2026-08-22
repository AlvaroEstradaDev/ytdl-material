import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { NotificationsPageComponent } from './notifications-page.component';
import { PostsService } from 'app/posts.services';
import { NotificationActionsService } from './notification-actions.service';

class MockPostsService {
  getNotificationsPaginated = vi.fn().mockReturnValue(of({
    items: [
      { uid: 'a', type: 'download_complete', text: 't', read: false, timestamp: 1, data: {}, actions: [] },
      { uid: 'b', type: 'download_error',    text: 't', read: false, timestamp: 2, data: {}, actions: [] }
    ],
    total: 2,
    unread_total: 2,
    limit: 10,
    offset: 0
  }));
  deleteNotification = vi.fn().mockReturnValue(of({}));
  deleteAllNotifications = vi.fn().mockReturnValue(of({}));
  setNotificationsToRead = vi.fn().mockReturnValue(of({}));
  initialized = true;
  service_initialized = of(true);
}

class MockActions {
  run = vi.fn();
}

describe('NotificationsPageComponent', () => {
  let component: NotificationsPageComponent;
  let fixture: ComponentFixture<NotificationsPageComponent>;
  let posts: MockPostsService;

  beforeEach(waitForAsync(() => {
    posts = new MockPostsService();
    TestBed.configureTestingModule({
      imports: [MatChipsModule, NoopAnimationsModule],
      declarations: [NotificationsPageComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PostsService, useValue: posts },
        { provide: NotificationActionsService, useValue: new MockActions() }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    localStorage.clear();
    fixture = TestBed.createComponent(NotificationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates and fetches first page on init', () => {
    expect(component).toBeTruthy();
    expect(posts.getNotificationsPaginated).toHaveBeenCalledWith({
      limit: 10, offset: 0, types: []
    });
  });

  it('filter chip change re-fetches with new types and resets offset', () => {
    posts.getNotificationsPaginated.mockClear();
    component.onFilterChange({ value: ['download_error'] } as any);
    expect(posts.getNotificationsPaginated).toHaveBeenCalledWith({
      limit: 10, offset: 0, types: ['download_error']
    });
  });

  it('delete single optimistic-updates total and items', () => {
    component.total = 2;
    component.items = [
      { uid: 'a', type: 'download_complete', text: '', read: false, timestamp: 1, data: {}, actions: [] } as any,
      { uid: 'b', type: 'download_error',    text: '', read: false, timestamp: 2, data: {}, actions: [] } as any
    ];
    component.deleteNotification('a');
    expect(component.items.length).toBe(1);
    expect(component.total).toBe(1);
  });

  it('delete last item on non-first page steps back one page and refetches', () => {
    component.limit = 10;
    component.offset = 10;
    component.total = 11;
    component.items = [{ uid: 'x' } as any];
    posts.getNotificationsPaginated.mockClear();
    component.deleteNotification('x');
    expect(component.offset).toBe(0);
    expect(posts.getNotificationsPaginated).toHaveBeenCalled();
  });

  it('onPageChange updates limit/offset and refetches', () => {
    posts.getNotificationsPaginated.mockClear();
    component.onPageChange({ limit: 25, offset: 50 });
    expect(component.limit).toBe(25);
    expect(component.offset).toBe(50);
    expect(posts.getNotificationsPaginated).toHaveBeenCalledWith({
      limit: 25, offset: 50, types: []
    });
  });

  afterEach(() => localStorage.clear());
});

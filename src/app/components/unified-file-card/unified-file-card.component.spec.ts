import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';

import { UnifiedFileCardComponent } from './unified-file-card.component';
import { configureTestBed } from '../../../testing/test-bed';

describe('UnifiedFileCardComponent', () => {
  let component: UnifiedFileCardComponent;
  let fixture: ComponentFixture<UnifiedFileCardComponent>;

  beforeEach(waitForAsync(() => {
    configureTestBed({
      declarations: [ UnifiedFileCardComponent ],
      providers: [
        { provide: MatDialog, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UnifiedFileCardComponent);
    component = fixture.componentInstance;
    component.theme = {
      ghost_primary: '#000000',
      ghost_secondary: '#111111'
    } as any;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should build preview stream URLs without a trailing slash before the query string', () => {
    component.baseStreamPath = '/api/';
    component.file_obj = {
      uid: 'uid with spaces',
      isAudio: false
    } as any;

    expect(component.generateStreamURL()).toBe('/api/stream?uid=uid%20with%20spaces&type=video&t=,10');
  });

  it('should use the upload date as the displayed date when requested', () => {
    component.displayDateProperty = 'upload_date';
    component.locale = { ngID: 'en-US' } as any;
    component.file_obj = {
      upload_date: '2020-01-02',
      registered: 1713715200000
    } as any;

    expect(component.displayedDateValue).toBe('2020-01-02');
    expect(component.displayedDateTimezone).toBe('UTC');
    expect(component.displayedDateLocale).toBe('en-US');
  });

  it('should fall back to the registered date when the upload date is unavailable', () => {
    component.displayDateProperty = 'upload_date';
    component.file_obj = {
      upload_date: 'N/A',
      registered: 1713715200000
    } as any;

    expect(component.displayedDateValue).toBe(1713715200000);
    expect(component.displayedDateTimezone).toBeUndefined();
  });

  it('should count a playlist by the uids it holds', () => {
    component.is_playlist = true;
    component.file_obj = {
      name: 'Example playlist',
      uids: ['one', 'two', 'three']
    } as any;

    expect(component.playlistItemCount).toBe(3);
    expect(component.playlistItemCountLabel).toBe('3 items');
  });

  it('should count an automatic playlist by the file count the server sent', () => {
    component.is_playlist = true;
    component.file_obj = {
      name: 'Music',
      auto: true,
      file_count: 157
    } as any;

    expect(component.playlistItemCount).toBe(157);
    expect(component.playlistItemCountLabel).toBe('157 items');
  });

  it('should count an empty playlist rather than treating it as unknown', () => {
    component.is_playlist = true;
    component.file_obj = {
      name: 'Empty playlist',
      uids: []
    } as any;

    expect(component.playlistItemCount).toBe(0);
    expect(component.playlistItemCountLabel).toBe('0 items');
  });

  it('should say item rather than items for a playlist holding one file', () => {
    component.is_playlist = true;
    component.file_obj = {
      name: 'Single',
      uids: ['only']
    } as any;

    expect(component.playlistItemCountLabel).toBe('1 item');
  });

  it('should not count a playlist whose size is unknown', () => {
    component.is_playlist = true;
    component.file_obj = {
      name: 'Unknown size'
    } as any;

    expect(component.playlistItemCount).toBeNull();
    expect(component.playlistItemCountLabel).toBeNull();
    expect(component.showPlaylistItemCount).toBe(false);
  });

  it('should not count a card that is not a playlist', () => {
    component.is_playlist = false;
    component.file_obj = {
      title: 'Example video',
      uids: ['one', 'two']
    } as any;

    expect(component.playlistItemCount).toBeNull();
    expect(component.showPlaylistItemCount).toBe(false);
  });

  it('should leave the count off a small card, which has no room for it', () => {
    component.is_playlist = true;
    component.card_size = 'small';
    component.file_obj = {
      name: 'Example playlist',
      uids: ['one', 'two']
    } as any;

    expect(component.playlistItemCountLabel).toBe('2 items');
    expect(component.showPlaylistItemCount).toBe(false);
  });

  it('should render the count under the playlist title', () => {
    component.loading = false;
    component.is_playlist = true;
    component.file_obj = {
      name: 'Example playlist',
      duration: 0,
      registered: Date.now(),
      uids: ['one', 'two', 'three']
    } as any;
    fixture.detectChanges();

    const count_element = fixture.debugElement.query(By.css('.playlist-item-count'));
    expect(count_element).not.toBeNull();
    expect(count_element.nativeElement.textContent.trim()).toBe('3 items');

    // The title gives up its second line to the count, so the block stays the same height.
    expect(fixture.debugElement.query(By.css('.playlist-text .max-one-line'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.playlist-text .max-two-lines'))).toBeNull();
  });

  it('should render a file card title without a count', () => {
    component.loading = false;
    component.is_playlist = false;
    component.file_obj = {
      uid: 'example-uid',
      title: 'Example title',
      duration: 90,
      registered: Date.now()
    } as any;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.playlist-item-count'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.max-two-lines'))).not.toBeNull();
  });

  it('should keep the thumbnail rendered while the hover preview is active', () => {
    component.loading = false;
    component.locale = { ngID: 'en-GB' } as any;
    component.file_obj = {
      uid: 'example-uid',
      duration: 90,
      type: 'video',
      isAudio: false,
      title: 'Example title',
      registered: Date.now(),
      thumbnailURL: 'https://example.com/thumb.jpg'
    } as any;
    component.elevated = true;
    component.hide_image = true;
    component.streamURL = 'https://example.com/preview.mp4';
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('video.preview-video'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('img'))).toBeNull();
  });
});

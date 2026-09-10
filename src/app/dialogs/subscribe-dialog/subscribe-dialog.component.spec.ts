import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';

import { SubscribeDialogComponent } from './subscribe-dialog.component';
import { configureTestBed } from '../../../testing/test-bed';
import { PostsService } from 'app/posts.services';

describe('SubscribeDialogComponent', () => {
  let component: SubscribeDialogComponent;
  let fixture: ComponentFixture<SubscribeDialogComponent>;

  beforeEach(waitForAsync(() => {
    configureTestBed({
      declarations: [ SubscribeDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubscribeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include the automatic playlist option when subscribing', () => {
    const postsService = TestBed.inject(PostsService) as any;
    postsService.createSubscription = vi.fn().mockReturnValue(of({new_sub: {id: 'subscription-1'}}));
    component.url = 'https://example.com/channel';
    component.autoCreatePlaylist = true;

    component.subscribeClicked();

    expect(postsService.createSubscription).toHaveBeenCalledWith(
      component.url,
      component.name,
      null,
      component.maxQuality,
      component.audioOnlyMode,
      component.customArgs,
      component.customFileOutput,
      component.useSubfolder,
      true,
      component.audioFormat,
      component.shortsMode,
      null
    );
  });

  it('should send the selected shorts mode when subscribing', () => {
    const postsService = TestBed.inject(PostsService) as any;
    postsService.createSubscription = vi.fn().mockReturnValue(of({new_sub: {id: 'subscription-1'}}));
    component.url = 'https://example.com/channel';
    component.shortsMode = 'exclude';

    component.subscribeClicked();

    expect(postsService.createSubscription).toHaveBeenCalledWith(
      component.url,
      component.name,
      null,
      component.maxQuality,
      component.audioOnlyMode,
      component.customArgs,
      component.customFileOutput,
      component.useSubfolder,
      component.autoCreatePlaylist,
      component.audioFormat,
      'exclude',
      null
    );
  });

  it('should send per-length audio formats when the toggle is on', () => {
    const postsService = TestBed.inject(PostsService) as any;
    postsService.createSubscription = vi.fn().mockReturnValue(of({new_sub: {id: 'subscription-1'}}));
    component.url = 'https://example.com/channel';
    component.audioOnlyMode = true;
    component.multiLengthAudioFormats = true;
    component.audioFormats = {short: 'mp3', medium: null, long: 'opus'};

    component.subscribeClicked();

    expect(postsService.createSubscription).toHaveBeenCalledWith(
      component.url,
      component.name,
      null,
      component.maxQuality,
      component.audioOnlyMode,
      component.customArgs,
      component.customFileOutput,
      component.useSubfolder,
      component.autoCreatePlaylist,
      null,            // single format hidden while the toggle is on
      component.shortsMode,
      {short: 'mp3', long: 'opus'}
    );
  });
});

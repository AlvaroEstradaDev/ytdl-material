import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditSubscriptionDialogComponent } from './edit-subscription-dialog.component';
import { configureTestBed } from '../../../testing/test-bed';

describe('EditSubscriptionDialogComponent', () => {
  let component: EditSubscriptionDialogComponent;
  let fixture: ComponentFixture<EditSubscriptionDialogComponent>;

  beforeEach(waitForAsync(() => {
    configureTestBed({
      declarations: [ EditSubscriptionDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditSubscriptionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('tracks audio format changes for save detection', () => {
    expect(component.subChanged()).toBe(false);

    component.audioFormat = 'flac';
    component.audioFormatChanged();
    expect(component.new_sub.audio_format).toBe('flac');
    expect(component.subChanged()).toBe(true);

    component.audioFormat = null;
    component.audioFormatChanged();
    expect('audio_format' in component.new_sub).toBe(false);
    expect(component.subChanged()).toBe(false);
  });

  it('treats a download-all round trip as unchanged', () => {
    expect(component.subChanged()).toBe(false);

    component.download_all = false;
    component.timerange_amount = 2;
    component.timerange_unit = 'days';
    component.timerangeChanged(null, false);
    expect(component.new_sub.timerange).toBe('now-2days');
    expect(component.subChanged()).toBe(true);

    component.download_all = true;
    component.downloadAllToggled();
    expect('timerange' in component.new_sub).toBe(false);
    expect(component.subChanged()).toBe(false);
  });

  it('defaults legacy subscriptions to all shorts and tracks shorts mode changes', () => {
    // the dialog data stub has no shorts_mode, matching subscriptions created before the setting existed
    expect(component.sub.shorts_mode).toBe('all');
    expect(component.new_sub.shorts_mode).toBe('all');
    expect(component.subChanged()).toBe(false);

    component.new_sub.shorts_mode = 'only';
    expect(component.subChanged()).toBe(true);

    component.new_sub.shorts_mode = 'all';
    expect(component.subChanged()).toBe(false);
  });
});

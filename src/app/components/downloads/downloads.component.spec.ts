import { DownloadsComponent } from './downloads.component';
import { Download } from 'api-types';
import { of } from 'rxjs';

describe('DownloadsComponent', () => {
  let component: DownloadsComponent;
  let posts_service_mock: any;
  let router_mock: any;
  let dialog_mock: any;
  let clipboard_mock: any;

  beforeEach(() => {
    localStorage.removeItem('downloads_page_size');

    posts_service_mock = {
      config: { Extra: { enable_downloads_manager: true } },
      initialized: true,
      service_initialized: of(true),
      getCurrentDownloads: jasmine.createSpy('getCurrentDownloads').and.returnValue(of({downloads: []})),
      getCurrentDownloadsPaginated: jasmine.createSpy('getCurrentDownloadsPaginated').and.returnValue(of({items: [], total: 0})),
      pauseDownload: jasmine.createSpy('pauseDownload').and.returnValue(of({success: true})),
      resumeDownload: jasmine.createSpy('resumeDownload').and.returnValue(of({success: true})),
      restartDownload: jasmine.createSpy('restartDownload').and.returnValue(of({success: true})),
      openSnackBar: jasmine.createSpy('openSnackBar')
    };
    router_mock = { navigate: () => {} };
    dialog_mock = { open: () => ({}), openDialogs: [] };
    clipboard_mock = { copy: () => true };

    component = new DownloadsComponent(posts_service_mock, router_mock, dialog_mock, clipboard_mock);
  });

  it('should create component instance', () => {
    expect(component).toBeTruthy();
  });

  it('does not coerce null percent to 0.00', () => {
    const download = {
      uid: 'download-1',
      error: null,
      finished: false,
      step_index: 1,
      percent_complete: null
    } as unknown as Download;

    expect(component.getNormalizedPercent(download)).toBeNull();
    expect(component.shouldShowPercentComplete(download)).toBeFalse();
  });

  it('keeps step text when percent is missing during step 2', () => {
    const download = {
      uid: 'download-1b',
      error: null,
      finished: false,
      step_index: 2,
      percent_complete: null
    } as unknown as Download;

    expect(component.shouldShowPercentComplete(download)).toBeFalse();
    expect(component.getNormalizedPercent(download)).toBeNull();
  });

  it('shows percent once a real numeric value exists', () => {
    const download = {
      uid: 'download-2',
      error: null,
      finished: false,
      step_index: 2,
      percent_complete: '12.34'
    } as unknown as Download;

    expect(component.shouldShowPercentComplete(download)).toBeTrue();
    expect(component.getNormalizedPercent(download)).toBe('12.34');
  });

  it('clamps percent to 100.00 for display', () => {
    const download = {
      uid: 'download-3',
      error: null,
      finished: false,
      step_index: 2,
      percent_complete: 123.456
    } as unknown as Download;

    expect(component.getNormalizedPercent(download)).toBe('100.00');
  });

  it('tracks whether failed downloads can be retried', () => {
    posts_service_mock.getCurrentDownloadsPaginated.and.returnValue(of({
      items: [
        {uid: 'download-1', error: 'Network error', cancelled: false},
        {uid: 'download-2', error: null, cancelled: false}
      ],
      total: 2
    }));

    component.getCurrentDownloads();

    expect(component.failed_download_exists).toBeTrue();
  });

  it('retries failed downloads only', () => {
    component.raw_downloads = [
      {uid: 'failed-1', error: 'Network error', finished: true, cancelled: false},
      {uid: 'complete-1', error: null, finished: true, cancelled: false},
      {uid: 'cancelled-1', error: 'Cancelled', error_type: 'cancelled', finished: true, cancelled: true}
    ] as unknown as Download[];

    component.retryFailedDownloads();

    expect(posts_service_mock.restartDownload).toHaveBeenCalledOnceWith('failed-1');
  });

  it('shows a failure message when retrying failed downloads fails', () => {
    component.raw_downloads = [
      {uid: 'failed-1', error: 'Network error', finished: true, cancelled: false}
    ] as unknown as Download[];
    posts_service_mock.restartDownload.and.returnValue(of({success: false}));

    component.retryFailedDownloads();

    expect(posts_service_mock.openSnackBar).toHaveBeenCalled();
  });

  it('shows resume instead of pause for paused downloads interrupted mid-step', () => {
    const pause_action = component.downloadActions.find(action => action.icon === 'pause')!;
    const resume_action = component.downloadActions.find(action => action.icon === 'play_arrow')!;
    const interrupted_download = {
      uid: 'paused-mid-step',
      finished: false,
      paused: true,
      finished_step: false
    } as unknown as Download;

    expect(pause_action.show(interrupted_download)).toBeFalse();
    expect(resume_action.show(interrupted_download)).toBeTrue();
  });

  it('resumes paused downloads even when their queue step needs retrying', () => {
    const interrupted_download = {
      uid: 'paused-mid-step',
      finished: false,
      paused: true,
      finished_step: false
    } as unknown as Download;

    component.resumeDownload(interrupted_download);

    expect(posts_service_mock.resumeDownload).toHaveBeenCalledOnceWith('paused-mid-step');
    expect(posts_service_mock.pauseDownload).not.toHaveBeenCalled();
  });

  it('updates pageSize and pageIndex from paginator pageChange event', () => {
    posts_service_mock.getCurrentDownloadsPaginated.and.returnValue(of({items: [], total: 200}));

    component.pageChangeEvent({limit: 50, offset: 100});

    expect(component.pageSize).toBe(50);
    expect(component.pageIndex).toBe(2);
    expect(posts_service_mock.getCurrentDownloadsPaginated).toHaveBeenCalled();
  });

  it('exposes empty pagination state on a fresh component', () => {
    expect(component.pageIndex).toBe(0);
    expect(component.total).toBe(0);
    expect(component.downloads).toEqual([]);
  });

  it('clamps pageIndex when total shrinks past current page', () => {
    // Page 5 with only 1 total item → must clamp back to page 0 and refetch.
    posts_service_mock.getCurrentDownloadsPaginated.and.returnValue(of({items: [], total: 1}));
    component.pageSize = 10;
    component.pageIndex = 5;

    component.getCurrentDownloads();

    expect(component.pageIndex).toBe(0);
    expect(posts_service_mock.getCurrentDownloadsPaginated).toHaveBeenCalledTimes(2);
  });

  it('merges chunked playlist progress with global sequential indices', () => {
    const chunk_1 = {
      uid: 'chunk-1',
      options: {playlistChunkRange: '1-3'},
      playlist_item_progress: [
        {index: 1, title: 'A', expected_file_size: 1, downloaded_size: 1, percent_complete: 100, status: 'complete', progress_path_index: 0},
        {index: 2, title: 'B', expected_file_size: 1, downloaded_size: 0, percent_complete: 10, status: 'downloading', progress_path_index: 1},
        {index: 3, title: 'C', expected_file_size: 1, downloaded_size: 0, percent_complete: 0, status: 'pending', progress_path_index: 2}
      ]
    };
    const chunk_2 = {
      uid: 'chunk-2',
      options: {playlistChunkRange: '4-6'},
      playlist_item_progress: [
        {index: 1, title: 'D', expected_file_size: 1, downloaded_size: 0, percent_complete: 0, status: 'pending', progress_path_index: 0},
        {index: 2, title: 'E', expected_file_size: 1, downloaded_size: 0, percent_complete: 0, status: 'pending', progress_path_index: 1},
        {index: 3, title: 'F', expected_file_size: 1, downloaded_size: 0, percent_complete: 0, status: 'pending', progress_path_index: 2}
      ]
    };

    const merged = (component as any).mergeBatchPlaylistProgress([chunk_2 as any, chunk_1 as any]);

    expect(Array.isArray(merged)).toBeTrue();
    expect(merged.map(item => item.index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(merged.map(item => item.title)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

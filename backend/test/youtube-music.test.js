/* eslint-disable no-undef */
const { assert, files_api, config_api } = require('./test-shared');
const downloader_api = require('../downloader');

describe('YouTube Music Source Detection', function() {
    it('extractYoutubeMusicIDFromUrl extracts video ID from music.youtube.com watch URL', function() {
        const id = files_api.extractYoutubeMusicIDFromUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ');
        assert.strictEqual(id, 'dQw4w9WgXcQ');
    });

    it('extractYoutubeMusicIDFromUrl extracts playlist ID from music.youtube.com playlist URL', function() {
        const id = files_api.extractYoutubeMusicIDFromUrl('https://music.youtube.com/playlist?list=LM');
        assert.strictEqual(id, 'LM');
    });

    it('extractYoutubeMusicIDFromUrl returns null for non-music youtube.com URL', function() {
        const id = files_api.extractYoutubeMusicIDFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        assert.strictEqual(id, null);
    });

    it('extractYoutubeMusicIDFromUrl returns null for twitch URL', function() {
        const id = files_api.extractYoutubeMusicIDFromUrl('https://twitch.tv/videos/12345');
        assert.strictEqual(id, null);
    });

    it('extractYoutubeMusicIDFromUrl returns null for empty string', function() {
        const id = files_api.extractYoutubeMusicIDFromUrl('');
        assert.strictEqual(id, null);
    });

    it('extractSourceMetadataFromUrl returns youtube-music extractor for music.youtube.com', function() {
        const metadata = files_api.extractSourceMetadataFromUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'audio');
        assert.strictEqual(metadata.source_id, 'dQw4w9WgXcQ');
        assert.strictEqual(metadata.source_extractor, 'youtube-music');
    });

    it('extractSourceMetadataFromUrl returns youtube extractor for regular youtube.com', function() {
        const metadata = files_api.extractSourceMetadataFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'audio');
        assert.strictEqual(metadata.source_id, 'dQw4w9WgXcQ');
        assert.strictEqual(metadata.source_extractor, 'youtube');
    });

    it('buildDuplicateKey normalizes youtube-music to youtube for shared dedup', function() {
        const key_music = files_api.buildDuplicateKey('youtube-music', 'dQw4w9WgXcQ', true);
        const key_yt = files_api.buildDuplicateKey('youtube', 'dQw4w9WgXcQ', true);
        assert.strictEqual(key_music, key_yt);
        assert.strictEqual(key_music, 'youtube:dQw4w9WgXcQ:audio');
    });
});

describe('isYoutubeMusicUrl', function() {
    it('returns true for music.youtube.com URL', function() {
        assert.strictEqual(downloader_api.isYoutubeMusicUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ'), true);
    });

    it('returns false for regular youtube.com URL', function() {
        assert.strictEqual(downloader_api.isYoutubeMusicUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
    });

    it('returns false for empty string', function() {
        assert.strictEqual(downloader_api.isYoutubeMusicUrl(''), false);
    });

    it('returns false for non-string input', function() {
        assert.strictEqual(downloader_api.isYoutubeMusicUrl(null), false);
        assert.strictEqual(downloader_api.isYoutubeMusicUrl(undefined), false);
    });

    it('returns true for music.youtube.com without protocol', function() {
        assert.strictEqual(downloader_api.isYoutubeMusicUrl('music.youtube.com/watch?v=abc'), true);
    });
});

describe('YouTube Music Download Args', function() {
    const original_config = {};

    beforeEach(function() {
        original_config.ytdl_audio_folder_path = config_api.getConfigItem('ytdl_audio_folder_path');
        original_config.ytdl_video_folder_path = config_api.getConfigItem('ytdl_video_folder_path');
        original_config.ytdl_default_file_output = config_api.getConfigItem('ytdl_default_file_output');
        original_config.ytdl_custom_args = config_api.getConfigItem('ytdl_custom_args');
        original_config.ytdl_use_cookies = config_api.getConfigItem('ytdl_use_cookies');
        original_config.ytdl_use_default_downloading_agent = config_api.getConfigItem('ytdl_use_default_downloading_agent');
        original_config.ytdl_include_thumbnail = config_api.getConfigItem('ytdl_include_thumbnail');
        original_config.ytdl_use_sponsorblock_api = config_api.getConfigItem('ytdl_use_sponsorblock_api');
        original_config.ytdl_default_downloader = config_api.getConfigItem('ytdl_default_downloader');
        original_config.ytdl_download_rate_limit = config_api.getConfigItem('ytdl_download_rate_limit');

        config_api.setConfigItem('ytdl_audio_folder_path', '/tmp/ytdl-test/audio');
        config_api.setConfigItem('ytdl_video_folder_path', '/tmp/ytdl-test/video');
        config_api.setConfigItem('ytdl_default_file_output', '');
        config_api.setConfigItem('ytdl_custom_args', '');
        config_api.setConfigItem('ytdl_use_cookies', false);
        config_api.setConfigItem('ytdl_use_default_downloading_agent', true);
        config_api.setConfigItem('ytdl_include_thumbnail', false);
        config_api.setConfigItem('ytdl_use_sponsorblock_api', false);
        config_api.setConfigItem('ytdl_default_downloader', 'yt-dlp');
        config_api.setConfigItem('ytdl_download_rate_limit', '');
    });

    afterEach(function() {
        for (const [key, value] of Object.entries(original_config)) {
            config_api.setConfigItem(key, value);
        }
    });

    it('generateArgs includes --embed-thumbnail for music.youtube.com audio URL', async function() {
        const args = await downloader_api.generateArgs(
            'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
            'audio',
            {}
        );
        assert(args.includes('--embed-thumbnail'), 'Expected --embed-thumbnail in args');
    });

    it('generateArgs includes --add-metadata for music.youtube.com audio URL', async function() {
        const args = await downloader_api.generateArgs(
            'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
            'audio',
            {}
        );
        assert(args.includes('--add-metadata'), 'Expected --add-metadata in args');
    });

    it('generateArgs includes --write-thumbnail for music.youtube.com audio URL', async function() {
        const args = await downloader_api.generateArgs(
            'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
            'audio',
            {}
        );
        assert(args.includes('--write-thumbnail'), 'Expected --write-thumbnail in args');
    });

    it('generateArgs does NOT include --embed-thumbnail for regular youtube.com URL', async function() {
        const args = await downloader_api.generateArgs(
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'audio',
            {}
        );
        assert(!args.includes('--embed-thumbnail'), 'Did not expect --embed-thumbnail for regular youtube');
    });
});

describe('YouTube Music ID3 Tags', function() {
    it('buildYoutubeMusicTags extracts artist, album, track from yt-dlp output', function() {
        const output_json = {
            title: 'Never Gonna Give You Up',
            artist: 'Rick Astley',
            album: 'Whenever You Need Somebody',
            track_number: '1',
            uploader: 'Rick Astley'
        };
        const tags = downloader_api.buildYoutubeMusicTags(output_json);
        assert.strictEqual(tags.title, 'Never Gonna Give You Up');
        assert.strictEqual(tags.artist, 'Rick Astley');
        assert.strictEqual(tags.album, 'Whenever You Need Somebody');
        assert.strictEqual(tags.trackNumber, '1');
    });

    it('buildYoutubeMusicTags falls back to uploader when artist missing', function() {
        const output_json = {
            title: 'Some Track',
            uploader: 'Some Channel'
        };
        const tags = downloader_api.buildYoutubeMusicTags(output_json);
        assert.strictEqual(tags.artist, 'Some Channel');
        assert.strictEqual(tags.album, undefined);
    });
});

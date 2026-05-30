/* eslint-disable no-undef */
const { assert, files_api } = require('./test-shared');

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

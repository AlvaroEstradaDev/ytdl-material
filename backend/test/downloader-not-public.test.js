/* eslint-disable no-undef */
const assert = require('assert');
const downloader_api = require('../downloader');

describe('Not-public error classification', function() {
    it('matches private/members-only/removed/unavailable', function() {
        assert.strictEqual(downloader_api.isNotPublicDownloadError("Private video. Sign in if you've been granted access"), true);
        assert.strictEqual(downloader_api.isNotPublicDownloadError('Join this channel to get access to members-only content'), true);
        assert.strictEqual(downloader_api.isNotPublicDownloadError('Member-only content'), true);
        assert.strictEqual(downloader_api.isNotPublicDownloadError('ERROR: Video unavailable'), true);
        assert.strictEqual(downloader_api.isNotPublicDownloadError('This video has been removed'), true);
    });
    it('rejects age-restriction and unrelated errors', function() {
        assert.strictEqual(downloader_api.isNotPublicDownloadError('Sign in to confirm your age'), false);
        assert.strictEqual(downloader_api.isNotPublicDownloadError('Unsupported URL'), false);
        assert.strictEqual(downloader_api.isNotPublicDownloadError(''), false);
        assert.strictEqual(downloader_api.isNotPublicDownloadError(null), false);
    });
    it('resolves generic error types to not_public on match', function() {
        assert.strictEqual(downloader_api.resolveDownloadErrorType('Private video', 'unknown_error'), 'not_public');
        assert.strictEqual(downloader_api.resolveDownloadErrorType('Private video', null), 'not_public');
    });
    it('keeps specific error types and non-matching messages', function() {
        assert.strictEqual(downloader_api.resolveDownloadErrorType('Private video', 'cancelled'), 'cancelled');
        assert.strictEqual(downloader_api.resolveDownloadErrorType('Boom', 'unknown_error'), 'unknown_error');
    });
});

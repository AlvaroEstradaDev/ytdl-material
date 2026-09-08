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

const { db_api, uuid } = require('./test-shared');
const notifications_api = require('../notifications');

describe('handleDownloadError not-public persistence', function() {
    const original_notify = notifications_api.sendDownloadErrorNotification;
    let notify_calls = 0;
    before(() => {
        notifications_api.sendDownloadErrorNotification = async () => { notify_calls += 1; };
    });
    after(() => { notifications_api.sendDownloadErrorNotification = original_notify; });

    it('overrides unknown_error with not_public for private videos', async function() {
        const uid = uuid();
        await db_api.insertRecordIntoTable('download_queue', {
            uid, url: 'https://x', error: null, error_summary: null, error_type: null,
            finished: false, running: true, paused: false
        });
        try {
            await downloader_api.handleDownloadError(uid, 'ERROR: Private video. Sign in', 'unknown_error');
            const record = await db_api.getRecord('download_queue', {uid});
            assert.strictEqual(record.error_type, 'not_public');
            assert.strictEqual(record.finished, true);
            assert.ok(record.error && record.error.length > 0);
            assert.ok(record.error_summary && record.error_summary.length > 0);
        } finally {
            await db_api.removeRecord('download_queue', {uid});
        }
    });

    it('treats not_public as skippable for subscriptions', function() {
        assert.strictEqual(downloader_api.isSkippableSubscriptionDownloadError('x', 'not_public'), true);
    });

    it('suppresses notification and persists not_public for subscription downloads', async function() {
        const uid = uuid();
        notify_calls = 0;
        await db_api.insertRecordIntoTable('download_queue', {
            uid, url: 'https://x', error: null, error_summary: null, error_type: null,
            sub_id: 'test-sub', user_uid: 'test-user',
            finished: false, running: true, paused: false
        });
        try {
            await downloader_api.handleDownloadError(uid, 'ERROR: Private video. Sign in', 'unknown_error');
            const record = await db_api.getRecord('download_queue', {uid});
            assert.strictEqual(record.error_type, 'not_public');
            assert.strictEqual(notify_calls, 0);
        } finally {
            await db_api.removeRecord('download_queue', {uid});
        }
    });
});

describe('not-public backfill', function() {
    it('reclassifies legacy errored records', async function() {
        const uid = uuid();
        const control_uid = uuid();
        await db_api.insertRecordIntoTable('download_queue', {
            uid, url: 'https://x', error: 'ERROR: Private video. Sign in',
            error_summary: 'ERROR: Private video. Sign in', error_type: null,
            finished: true, running: false, paused: false
        });
        // Control row: errored, but its message does not match the not-public text list.
        await db_api.insertRecordIntoTable('download_queue', {
            uid: control_uid, url: 'https://x', error: 'Sign in to confirm your age',
            error_summary: 'Sign in to confirm your age', error_type: null,
            finished: true, running: false, paused: false
        });
        try {
            const updated = await downloader_api.backfillNotPublicDownloadErrorTypes();
            assert.ok(updated >= 1);
            assert.strictEqual((await db_api.getRecord('download_queue', {uid})).error_type, 'not_public');
            assert.strictEqual((await db_api.getRecord('download_queue', {uid: control_uid})).error_type, null);
            await downloader_api.backfillNotPublicDownloadErrorTypes();
            assert.strictEqual((await db_api.getRecord('download_queue', {uid})).error_type, 'not_public'); // idempotent
            assert.strictEqual((await db_api.getRecord('download_queue', {uid: control_uid})).error_type, null);
        } finally {
            await db_api.removeRecord('download_queue', {uid});
            await db_api.removeRecord('download_queue', {uid: control_uid});
        }
    });
});

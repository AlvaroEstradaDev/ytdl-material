/* eslint-disable no-undef */
const { assert, db_api, uuid } = require('./test-shared');
const { buildDownloadQuery } = require('../utils/downloads-filters');

// NOTE: real downloads table is 'download_queue' (NOT 'downloads' which is a
// separate historical table). Mirror that here.
describe('downloads pagination (query construction)', function() {
    const TABLE = 'download_queue';
    const user_uid = 'dl-user';
    const SORT = { by: 'timestamp_start', order: -1 };

    beforeEach(async function() {
        await db_api.removeAllRecords(TABLE);
        for (let i = 0; i < 25; i++) {
            await db_api.insertRecordIntoTable(TABLE, {
                uid: uuid(),
                user_uid,
                timestamp_start: 1000 + i,
                title: `video ${i}`,
                sub_name: i % 3 === 0 ? null : 'Daily',
                sub_id: i % 3 === 0 ? null : 'sub-1',
                finished: i >= 20,
                error: null,
                paused: false,
                cancelled: false,
                step_index: 2
            });
        }
    });

    after(async function() {
        await db_api.removeAllRecords(TABLE);
    });

    it('returns a page with total over all user-scoped downloads', async function() {
        const query = buildDownloadQuery({ user_uid }, {});
        const res = await db_api.getPaginatedRecords(TABLE, query, SORT, { limit: 10, offset: 0 });
        assert.strictEqual(res.items.length, 10);
        assert.strictEqual(res.total, 25);
    });

    it('empty base query matches all (single-user mode analog)', async function() {
        const query = buildDownloadQuery({}, {});
        const res = await db_api.getPaginatedRecords(TABLE, query, SORT, { limit: 50, offset: 0 });
        assert.strictEqual(res.total, 25);
    });

    it('titleRegex filters by case-insensitive regex', async function() {
        const query = buildDownloadQuery({ user_uid }, { titleRegex: 'VIDEO 1' });
        const res = await db_api.getPaginatedRecords(TABLE, query, SORT, { limit: 50, offset: 0 });
        // matches "video 1", "video 10".."video 19" → 11 items
        assert.strictEqual(res.total, 11);
    });

    it('invalid titleRegex falls back to match-all', async function() {
        const query = buildDownloadQuery({ user_uid }, { titleRegex: '[' });
        const res = await db_api.getPaginatedRecords(TABLE, query, SORT, { limit: 50, offset: 0 });
        assert.strictEqual(res.total, 25);
    });

    it('subscriptions N/A bucket matches null sub_name', async function() {
        const query = buildDownloadQuery({ user_uid }, { subscriptions: ['N/A'] });
        const res = await db_api.getPaginatedRecords(TABLE, query, SORT, { limit: 50, offset: 0 });
        // indices 0, 3, 6, 9, 12, 15, 18, 21, 24 → 9 items
        assert.strictEqual(res.total, 9);
    });

    it('progressStages errored matches finished+error docs', async function() {
        await db_api.insertRecordIntoTable(TABLE, {
            uid: uuid(), user_uid, timestamp_start: 9999,
            title: 'err', finished: true, error: 'boom'
        });
        const query = buildDownloadQuery({ user_uid }, { progressStages: ['errored'] });
        const res = await db_api.getPaginatedRecords(TABLE, query, SORT, { limit: 50, offset: 0 });
        assert.strictEqual(res.total, 1);
    });

    it('combined scope + user filters', async function() {
        // Scope adds finished:false (legacy only_unfinished analog)
        const query = buildDownloadQuery({ user_uid, finished: false }, { titleRegex: 'video 1' });
        const res = await db_api.getPaginatedRecords(TABLE, query, SORT, { limit: 50, offset: 0 });
        // matches "video 1", "video 10".."video 19" → 11 items, all unfinished (i<20)
        // indices 1,10-19 → 11 items
        assert.strictEqual(res.total, 11);
    });
});

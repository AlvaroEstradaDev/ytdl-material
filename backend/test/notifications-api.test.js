/* eslint-disable no-undef */
const { assert, db_api, uuid } = require('./test-shared');

// Query-construction tests. These exercise db_api.getPaginatedRecords directly
// with the same query the endpoint will build, keeping the test deterministic
// and dependency-free (no HTTP/supertest).
describe('notifications pagination (query construction)', function() {
    const user_uid = 'notif-user';
    const SORT = { by: 'timestamp', order: -1 };

    beforeEach(async function() {
        await db_api.removeAllRecords('notifications');
        for (let i = 0; i < 25; i++) {
            await db_api.insertRecordIntoTable('notifications', {
                uid: uuid(),
                user_uid,
                type: i % 2 === 0 ? 'download_complete' : 'download_error',
                read: i < 5, // first 5 are read
                timestamp: 1000 + i,
                text: `n${i}`,
                data: {}
            });
        }
    });

    after(async function() {
        await db_api.removeAllRecords('notifications');
    });

    it('respects limit and computes total over all matching', async function() {
        const query = { user_uid };
        const res = await db_api.getPaginatedRecords('notifications', query, SORT, { limit: 10, offset: 0 });
        assert.strictEqual(res.items.length, 10);
        assert.strictEqual(res.total, 25);
    });

    it('unread_only filter shrinks both items and total', async function() {
        const query = { user_uid, read: false };
        const res = await db_api.getPaginatedRecords('notifications', query, SORT, { limit: 10, offset: 0 });
        assert.strictEqual(res.total, 20); // 25 - 5 read
        assert.ok(res.items.every(n => !n.read));
    });

    it('types filter narrows by $in', async function() {
        const query = { user_uid, type: { $in: ['download_error'] } };
        const res = await db_api.getPaginatedRecords('notifications', query, SORT, { limit: 50, offset: 0 });
        // odd indices 1,3,5...23 → 12 items
        assert.strictEqual(res.total, 12);
        assert.ok(res.items.every(n => n.type === 'download_error'));
    });

    it('offset returns later page', async function() {
        const res = await db_api.getPaginatedRecords('notifications', { user_uid }, SORT, { limit: 10, offset: 20 });
        assert.strictEqual(res.items.length, 5);
    });

    it('sort is timestamp DESC (latest first)', async function() {
        const res = await db_api.getPaginatedRecords('notifications', { user_uid }, SORT, { limit: 10, offset: 0 });
        assert.strictEqual(res.items[0].timestamp, 1024);
        assert.strictEqual(res.items[1].timestamp, 1023);
    });

    it('global unread count ignores type filter (mirrors /api/getNotifications unread_total)', async function() {
        // The endpoint builds its badge count from {user_uid, read:false} only,
        // independent of the types[] filter applied to the listed items. This
        // test pins that contract: even with a narrow list filter, the unread
        // count reflects every unread notification for the user.
        const list_query = { user_uid, type: { $in: ['download_error'] } };
        const list = await db_api.getPaginatedRecords('notifications', list_query, SORT, { limit: 10, offset: 0 });

        const unread_total = await db_api.getRecords('notifications', { user_uid, read: false }, true);

        // 25 total, 5 read → 20 unread globally.
        assert.strictEqual(unread_total, 20);
        // Listed items respect the type filter and include both read+unread.
        assert.ok(list.items.every(n => n.type === 'download_error'));
        assert.strictEqual(list.total, 12);
    });
});

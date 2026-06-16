/* eslint-disable no-undef */
const { assert, db_api, uuid } = require('./test-shared');

describe('DB pagination', function() {
    // Use the existing 'test' table which is safe to clear between tests.
    // The shape: { uid, user_uid, timestamp, idx } — sort by timestamp DESC.
    beforeEach(async function() {
        await db_api.removeAllRecords('test');
        for (let i = 0; i < 25; i++) {
            await db_api.insertRecordIntoTable('test', {
                uid: uuid(),
                user_uid: 'u1',
                idx: i,
                timestamp: 1000 + i
            });
        }
    });

    after(async function() {
        await db_api.removeAllRecords('test');
    });

    it('returns limited items with correct total and sort applied', async function() {
        const res = await db_api.getPaginatedRecords('test',
            { user_uid: 'u1' },
            { by: 'timestamp', order: -1 },
            { limit: 10, offset: 0 });
        assert.strictEqual(res.items.length, 10);
        assert.strictEqual(res.total, 25);
        assert.strictEqual(res.limit, 10);
        assert.strictEqual(res.offset, 0);
        // DESC sort → highest timestamp first → idx 24
        assert.strictEqual(res.items[0].idx, 24);
    });

    it('offset skips correctly', async function() {
        const res = await db_api.getPaginatedRecords('test',
            { user_uid: 'u1' },
            { by: 'timestamp', order: -1 },
            { limit: 10, offset: 10 });
        assert.strictEqual(res.items.length, 10);
        // offset 10 → idx 14 is highest of remaining (24,23,...,15 → first item idx 14)
        assert.strictEqual(res.items[0].idx, 14);
    });

    it('returns remaining items on last page', async function() {
        const res = await db_api.getPaginatedRecords('test',
            { user_uid: 'u1' },
            { by: 'timestamp', order: -1 },
            { limit: 10, offset: 20 });
        assert.strictEqual(res.items.length, 5);
    });

    it('clamps limit to [1, 100]', async function() {
        const tooMany = await db_api.getPaginatedRecords('test',
            { user_uid: 'u1' },
            { by: 'timestamp', order: -1 },
            { limit: 999, offset: 0 });
        assert.strictEqual(tooMany.limit, 100);

        const tooFew = await db_api.getPaginatedRecords('test',
            { user_uid: 'u1' },
            { by: 'timestamp', order: -1 },
            { limit: 0, offset: 0 });
        assert.strictEqual(tooFew.limit, 1);
    });

    it('clamps negative offset to 0', async function() {
        const res = await db_api.getPaginatedRecords('test',
            { user_uid: 'u1' },
            { by: 'timestamp', order: -1 },
            { limit: 10, offset: -5 });
        assert.strictEqual(res.offset, 0);
    });

    it('defaults to limit=10 offset=0 when pagination missing', async function() {
        const res = await db_api.getPaginatedRecords('test',
            { user_uid: 'u1' },
            { by: 'timestamp', order: -1 });
        assert.strictEqual(res.limit, 10);
        assert.strictEqual(res.offset, 0);
        assert.strictEqual(res.items.length, 10);
    });

    it('treats null limit/offset as defaults (not 0/1)', async function() {
        const res = await db_api.getPaginatedRecords('test',
            { user_uid: 'u1' },
            { by: 'timestamp', order: -1 },
            { limit: null, offset: null });
        assert.strictEqual(res.limit, 10);
        assert.strictEqual(res.offset, 0);
        assert.strictEqual(res.items.length, 10);
    });
});

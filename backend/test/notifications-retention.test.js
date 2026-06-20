/* eslint-disable no-undef */
const { assert, db_api, uuid } = require('./test-shared');
const notifications_api = require('../notifications');
const config_api = require('../config');

describe('notifications retention (pruneTableToCount)', function() {
    const SORT = { by: 'timestamp', order: -1 };

    beforeEach(async function() {
        await db_api.removeAllRecords('notifications');
    });

    after(async function() {
        await db_api.removeAllRecords('notifications');
    });

    async function insertMany(user_uid, count, start_timestamp = 1000) {
        for (let i = 0; i < count; i++) {
            await db_api.insertRecordIntoTable('notifications', {
                uid: uuid(),
                user_uid,
                type: 'download_complete',
                read: false,
                timestamp: start_timestamp + i,
                text: `n${i}`,
                data: {}
            });
        }
    }

    it('prunes oldest when count exceeds cap * hysteresis', async function() {
        await insertMany('userA', 25);  // timestamps 1000..1024
        const deleted = await db_api.pruneTableToCount(
            'notifications', { user_uid: 'userA' }, SORT, 10);
        // cap=10, threshold = ceil(10*1.2) = 12. count=25 > 12 → prune to 10.
        assert.strictEqual(deleted, 15);
        const remaining = await db_api.getRecords('notifications', { user_uid: 'userA' });
        assert.strictEqual(remaining.length, 10);
        // Newest 10 kept: timestamps 1015..1024
        const ts = remaining.map(n => n.timestamp).sort((a, b) => a - b);
        assert.strictEqual(ts[0], 1015);
        assert.strictEqual(ts[ts.length - 1], 1024);
    });

    it('no-op when count is at or below cap', async function() {
        await insertMany('userA', 10);
        const deleted = await db_api.pruneTableToCount(
            'notifications', { user_uid: 'userA' }, SORT, 10);
        assert.strictEqual(deleted, 0);
        const remaining = await db_api.getRecords('notifications', { user_uid: 'userA' });
        assert.strictEqual(remaining.length, 10);
    });

    it('no-op when count is between cap and cap*hysteresis (hysteresis window)', async function() {
        // cap=10, threshold = ceil(12). count=12 → no-op (within hysteresis).
        await insertMany('userA', 12);
        const deleted = await db_api.pruneTableToCount(
            'notifications', { user_uid: 'userA' }, SORT, 10);
        assert.strictEqual(deleted, 0);
    });

    it('no-op when cap is 0 (unlimited)', async function() {
        await insertMany('userA', 100);
        const deleted = await db_api.pruneTableToCount(
            'notifications', { user_uid: 'userA' }, SORT, 0);
        assert.strictEqual(deleted, 0);
    });

    it('no-op when cap is negative', async function() {
        await insertMany('userA', 5);
        const deleted = await db_api.pruneTableToCount(
            'notifications', { user_uid: 'userA' }, SORT, -1);
        assert.strictEqual(deleted, 0);
    });

    it('per-user isolation: pruning one user does not affect another', async function() {
        await insertMany('userA', 25);
        await insertMany('userB', 5, 5000);
        await db_api.pruneTableToCount(
            'notifications', { user_uid: 'userA' }, SORT, 10);
        const a = await db_api.getRecords('notifications', { user_uid: 'userA' });
        const b = await db_api.getRecords('notifications', { user_uid: 'userB' });
        assert.strictEqual(a.length, 10);
        assert.strictEqual(b.length, 5);
    });

    it('refuses to prune with empty filter (safety guard)', async function() {
        await insertMany('userA', 25);
        await insertMany('userB', 25);
        const deleted = await db_api.pruneTableToCount(
            'notifications', {}, SORT, 10);
        assert.strictEqual(deleted, 0);
        // Nothing touched.
        const all = await db_api.getRecords('notifications');
        assert.strictEqual(all.length, 50);
    });

    it('prunes null-user_uid scope (single-user mode)', async function() {
        // Single-user mode writes user_uid=null for task notifications.
        for (let i = 0; i < 25; i++) {
            await db_api.insertRecordIntoTable('notifications', {
                uid: uuid(),
                user_uid: null,
                type: 'task_finished',
                read: false,
                timestamp: 1000 + i,
                text: `nulluser-n${i}`,
                data: {}
            });
        }
        const deleted = await db_api.pruneTableToCount(
            'notifications', { user_uid: null }, SORT, 10);
        assert.strictEqual(deleted, 15);
        const remaining = await db_api.getRecords('notifications', { user_uid: null });
        assert.strictEqual(remaining.length, 10);
    });
});

describe('generateJSONTables preserves notifications (migration regression)', function() {
    it('carries notifications array from old db.json shape into new tables_obj', async function() {
        const fake_old_db = {
            files: [],
            playlists: [],
            categories: [],
            subscriptions: [],
            downloads: {},
            notifications: [
                { uid: 'notif-1', type: 'task_finished', read: false, timestamp: 1, data: {}, user_uid: 'admin' },
                { uid: 'notif-2', type: 'download_complete', read: true, timestamp: 2, data: {}, user_uid: 'admin' }
            ]
        };
        const fake_users_db = {
            users: [{ uid: 'admin', name: 'Admin', files: [], playlists: [], categories: [], subscriptions: [] }],
            roles: { admin: { permissions: [] } }
        };
        const tables_obj = await db_api.generateJSONTables(fake_old_db, fake_users_db);
        assert.ok(Array.isArray(tables_obj.notifications), 'notifications array should exist on tables_obj');
        assert.strictEqual(tables_obj.notifications.length, 2);
        assert.strictEqual(tables_obj.notifications[0].uid, 'notif-1');
    });

    it('defaults to empty array when source db_json lacks notifications key', async function() {
        const fake_old_db = {
            files: [], playlists: [], categories: [], subscriptions: [], downloads: {}
            // no notifications key — simulates fresh install pre-migration
        };
        const fake_users_db = {
            users: [{ uid: 'admin', name: 'Admin', files: [], playlists: [], categories: [], subscriptions: [] }],
            roles: { admin: { permissions: [] } }
        };
        const tables_obj = await db_api.generateJSONTables(fake_old_db, fake_users_db);
        assert.ok(Array.isArray(tables_obj.notifications));
        assert.strictEqual(tables_obj.notifications.length, 0);
    });
});

describe('pruneAllNotifications helper', function() {
    const SORT = { by: 'timestamp', order: -1 };

    beforeEach(async function() {
        await db_api.removeAllRecords('notifications');
    });

    after(async function() {
        await db_api.removeAllRecords('notifications');
    });

    async function insertMany(user_uid, count, start_timestamp = 1000) {
        for (let i = 0; i < count; i++) {
            await db_api.insertRecordIntoTable('notifications', {
                uid: uuid(),
                user_uid,
                type: 'download_complete',
                read: false,
                timestamp: start_timestamp + i,
                text: `n${i}`,
                data: {}
            });
        }
    }

    // These tests rely on the configured ytdl_notifications_retention_count.
    // The default is 500 (set in default.json). To make tests deterministic
    // we stub config_api.getConfigItem to return a small cap, then restore.
    let original_getConfigItem;
    const STUB_CAP = 10;

    beforeEach(function() {
        original_getConfigItem = config_api.getConfigItem;
        config_api.getConfigItem = (key) => {
            if (key === 'ytdl_notifications_retention_count') return STUB_CAP;
            return original_getConfigItem.call(config_api, key);
        };
    });

    afterEach(function() {
        if (original_getConfigItem) {
            config_api.getConfigItem = original_getConfigItem;
            original_getConfigItem = null;
        }
    });

    it('prunes across multiple real users in one call', async function() {
        await insertMany('userA', 25);
        await insertMany('userB', 25);
        const total = await notifications_api.pruneAllNotifications();
        // Each user: cap=10, count=25 > 12 (hysteresis) → prune 15. Total = 30.
        assert.strictEqual(total, 30);
        const a = await db_api.getRecords('notifications', { user_uid: 'userA' });
        const b = await db_api.getRecords('notifications', { user_uid: 'userB' });
        assert.strictEqual(a.length, 10);
        assert.strictEqual(b.length, 10);
    });

    it('prunes the null-user_uid scope (single-user mode)', async function() {
        for (let i = 0; i < 25; i++) {
            await db_api.insertRecordIntoTable('notifications', {
                uid: uuid(),
                user_uid: null,
                type: 'task_finished',
                read: false,
                timestamp: 1000 + i,
                text: `nulluser-n${i}`,
                data: {}
            });
        }
        const total = await notifications_api.pruneAllNotifications();
        assert.strictEqual(total, 15);
        const remaining = await db_api.getRecords('notifications', { user_uid: null });
        assert.strictEqual(remaining.length, 10);
    });

    it('no-op when retention cap is disabled (cap <= 0)', async function() {
        config_api.getConfigItem = (key) => {
            if (key === 'ytdl_notifications_retention_count') return 0;
            return original_getConfigItem.call(config_api, key);
        };
        await insertMany('userA', 50);
        const total = await notifications_api.pruneAllNotifications();
        assert.strictEqual(total, 0);
        const remaining = await db_api.getRecords('notifications', { user_uid: 'userA' });
        assert.strictEqual(remaining.length, 50);
    });

    it('mixed: real users + null-user pruned independently', async function() {
        await insertMany('userA', 25, 1000);
        await insertMany('userB', 5, 5000);
        for (let i = 0; i < 25; i++) {
            await db_api.insertRecordIntoTable('notifications', {
                uid: uuid(),
                user_uid: null,
                type: 'task_finished',
                read: false,
                timestamp: 9000 + i,
                text: `nulluser-n${i}`,
                data: {}
            });
        }
        const total = await notifications_api.pruneAllNotifications();
        // userA: 25→10 (prune 15). userB: 5→no-op. null: 25→10 (prune 15). Total = 30.
        assert.strictEqual(total, 30);
        const a = await db_api.getRecords('notifications', { user_uid: 'userA' });
        const b = await db_api.getRecords('notifications', { user_uid: 'userB' });
        const n = await db_api.getRecords('notifications', { user_uid: null });
        assert.strictEqual(a.length, 10);
        assert.strictEqual(b.length, 5);
        assert.strictEqual(n.length, 10);
    });
});

/* eslint-disable no-undef */
const assert = require('assert');
const {
    buildTitleFilter,
    buildStageFilter,
    buildDateFilter,
    buildSubsFilter,
    buildDownloadQuery,
    STAGE_QUERIES
} = require('../utils/downloads-filters');

describe('downloads-filters', function() {
    describe('buildTitleFilter', function() {
        it('returns null when regex is empty/undefined', function() {
            assert.strictEqual(buildTitleFilter(undefined), null);
            assert.strictEqual(buildTitleFilter(''), null);
        });
        it('returns a case-insensitive regex query on valid input', function() {
            assert.deepStrictEqual(buildTitleFilter('foo.'), { title: { $regex: 'foo.', $options: 'i' } });
        });
        it('returns null on invalid regex (match-all fallback)', function() {
            assert.strictEqual(buildTitleFilter('['), null);
            assert.strictEqual(buildTitleFilter('*'), null);
        });
    });

    describe('buildStageFilter', function() {
        it('returns null when no stages selected', function() {
            assert.strictEqual(buildStageFilter([]), null);
            assert.strictEqual(buildStageFilter(undefined), null);
        });
        it('returns $or of stage queries for selected stages', function() {
            const result = buildStageFilter(['errored', 'complete']);
            assert.ok(result.$or);
            assert.strictEqual(result.$or.length, 2);
            assert.deepStrictEqual(result.$or[0], STAGE_QUERIES.errored);
            assert.deepStrictEqual(result.$or[1], STAGE_QUERIES.complete);
        });
        it('ignores unknown stage names', function() {
            const result = buildStageFilter(['errored', 'bogus']);
            assert.strictEqual(result.$or.length, 1);
        });
    });

    describe('buildDateFilter', function() {
        it('returns null when range absent', function() {
            assert.strictEqual(buildDateFilter(undefined), null);
            assert.strictEqual(buildDateFilter({}), null);
        });
        it('converts ms to seconds for timestamp_start bounds', function() {
            const r = buildDateFilter({ from: 1000000, to: 2000000 });
            assert.deepStrictEqual(r, { timestamp_start: { $gte: 1000, $lte: 2000 } });
        });
        it('handles one-sided ranges', function() {
            assert.deepStrictEqual(buildDateFilter({ from: 5000 }), { timestamp_start: { $gte: 5 } });
            assert.deepStrictEqual(buildDateFilter({ to: 5000 }), { timestamp_start: { $lte: 5 } });
        });
    });

    describe('buildSubsFilter', function() {
        it('returns null when no subs', function() {
            assert.strictEqual(buildSubsFilter([]), null);
            assert.strictEqual(buildSubsFilter(undefined), null);
        });
        it('uses $in for named subs', function() {
            assert.deepStrictEqual(buildSubsFilter(['Daily']), { sub_name: { $in: ['Daily'] } });
        });
        it('includes null in $in when N/A bucket requested', function() {
            assert.deepStrictEqual(buildSubsFilter(['N/A']), { sub_name: { $in: ['N/A', null] } });
        });
    });

    describe('buildDownloadQuery', function() {
        it('returns just user_uid when no filters', function() {
            assert.deepStrictEqual(buildDownloadQuery('u1', {}), { user_uid: 'u1' });
        });
        it('ANDs multiple filters', function() {
            const q = buildDownloadQuery('u1', { titleRegex: 'foo', subscriptions: ['Daily'] });
            assert.strictEqual(q.user_uid, 'u1');
            assert.ok(q.$and);
            assert.strictEqual(q.$and.length, 2);
        });
    });
});

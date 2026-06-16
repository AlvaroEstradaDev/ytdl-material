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

// In-JS predicate matcher sufficient for the field shapes used in STAGE_QUERIES
// (literals, $ne, $gte, $in, $not, $nin).
function matchesPredicate(doc, pred) {
    for (const [key, cond] of Object.entries(pred)) {
        const v = doc[key];
        if (cond === null) {
            if (v !== null && v !== undefined) return false;
            continue;
        }
        if (typeof cond !== 'object') {
            if (v !== cond) return false;
            continue;
        }
        for (const [op, operand] of Object.entries(cond)) {
            if (op === '$ne')        { if (v === operand) return false; }
            else if (op === '$gte')  { if (!(v >= operand)) return false; }
            else if (op === '$lte')  { if (!(v <= operand)) return false; }
            else if (op === '$in')   { if (!operand.includes(v)) return false; }
            else if (op === '$nin')  { if (operand.includes(v)) return false; }
            else if (op === '$not')  {
                // $not operand is itself a query doc; match if inner does NOT match
                if (matchesPredicate(doc, { [key]: operand })) return false;
            }
            else throw new Error(`Unsupported op in test helper: ${op}`);
        }
    }
    return true;
}

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

        it('active-downloading matches missing step_index', function() {
            const result = buildStageFilter(['active-downloading']);
            // Simulate Mongo's predicate evaluation in pure JS for verification
            const stageQuery = result.$or[0];
            // Missing step_index should match (client deriveStage falls through)
            const missingStepDoc = { finished: false };
            const matchesMissing = matchesPredicate(missingStepDoc, stageQuery);
            assert.ok(matchesMissing, 'download with missing step_index should match active-downloading');

            // step_index: 0 should NOT match (that's active-creating)
            const step0Doc = { finished: false, step_index: 0 };
            assert.ok(!matchesPredicate(step0Doc, stageQuery), 'step_index:0 must NOT match active-downloading');
        });

        it('errored and complete handle error="" like client truthiness', function() {
            const erroredFilter = buildStageFilter(['errored']);
            const completeFilter = buildStageFilter(['complete']);
            // error: "" → client `if (download.finished && download.error)` treats "" as falsy → complete
            const emptyErrorDoc = { finished: true, error: '' };
            assert.ok(!matchesPredicate(emptyErrorDoc, erroredFilter.$or[0]),
                'error:"" must NOT match errored (client truthiness)');
            assert.ok(matchesPredicate(emptyErrorDoc, completeFilter.$or[0]),
                'error:"" MUST match complete');
        });

        it('returns cloned predicates (no shared refs with STAGE_QUERIES)', function() {
            const result = buildStageFilter(['errored']);
            assert.notStrictEqual(result.$or[0], STAGE_QUERIES.errored,
                'returned predicate must be a clone, not the original ref');
            // Mutate the returned query; STAGE_QUERIES must be unaffected
            result.$or[0].finished = 'tampered';
            assert.strictEqual(STAGE_QUERIES.errored.finished, true,
                'STAGE_QUERIES must not be mutated by caller changes');
        });

        it('deduplicates duplicate stage names', function() {
            const result = buildStageFilter(['errored', 'errored', 'complete']);
            assert.strictEqual(result.$or.length, 2);
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

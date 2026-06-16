/* eslint-disable no-undef */
const assert = require('assert');
const { STAGE_QUERIES } = require('../utils/downloads-filters');

// Mirrors DownloadsComponent.deriveStage() exactly.
// Source of truth: src/app/components/downloads/downloads.component.ts:804-812.
// If the client function changes, UPDATE BOTH this mirror and STAGE_QUERIES, then re-run.
function deriveStage(download) {
    if (download.cancelled) return 'cancelled';
    if (download.paused) return 'paused';
    if (download.finished && download.error) return 'errored';
    if (download.finished) return 'complete';
    if (download.step_index === 0) return 'active-creating';
    if (download.step_index === 1) return 'active-getting-info';
    return 'active-downloading';
}

// Pure in-JS predicate matcher replicating how Mongo evaluates the query,
// sufficient for the field shapes used in STAGE_QUERIES
// (literals + $ne/$gte/$lte/$in/$nin/$not).
function matchesPredicate(doc, pred) {
    for (const [key, cond] of Object.entries(pred)) {
        // Mongo treats a missing field as null for the operators used in
        // STAGE_QUERIES ($in/$nin/$ne/$gte/$lte). Normalize undefined→null
        // so the in-JS matcher mirrors real Mongo evaluation.
        const v = doc[key] === undefined ? null : doc[key];
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
                // $not operand is itself a query doc; matches iff inner does NOT match
                if (matchesPredicate(doc, { [key]: operand })) return false;
            }
            else throw new Error(`Unsupported op in contract test: ${op}`);
        }
    }
    return true;
}

describe('progressStages drift contract', function() {
    // Each fixture must classify uniquely into exactly one stage by deriveStage()
    // AND match exactly that stage's predicate (no other).
    const fixtures = [
        { name: 'cancelled',                       doc: { cancelled: true } },
        { name: 'paused (not cancelled)',          doc: { paused: true } },
        { name: 'paused+cancelled→cancelled',      doc: { paused: true, cancelled: true } },
        { name: 'errored (error truthy)',          doc: { finished: true, error: 'boom' } },
        { name: 'errored (error empty string)→complete', doc: { finished: true, error: '' } },
        { name: 'complete (error null)',           doc: { finished: true, error: null } },
        { name: 'complete (error missing)',        doc: { finished: true } },
        { name: 'active-creating (step 0)',        doc: { finished: false, step_index: 0 } },
        { name: 'active-getting-info (step 1)',    doc: { finished: false, step_index: 1 } },
        { name: 'active-downloading (step 2)',     doc: { finished: false, step_index: 2 } },
        { name: 'active-downloading (step 5)',     doc: { finished: false, step_index: 5 } },
        { name: 'active-downloading (step missing)', doc: { finished: false } },
        { name: 'active-downloading (step null)',  doc: { finished: false, step_index: null } },
        { name: 'paused with step_index=2→paused', doc: { paused: true, step_index: 2 } },
        { name: 'cancelled with step_index=1→cancelled', doc: { cancelled: true, step_index: 1 } },
        { name: 'errored+paused→paused',           doc: { paused: true, finished: true, error: 'x' } },
    ];

    for (const { name, doc } of fixtures) {
        it(`classifies "${name}" identically on client and server`, function() {
            const clientStage = deriveStage(doc);
            for (const [stageName, predicate] of Object.entries(STAGE_QUERIES)) {
                const serverMatch = matchesPredicate(doc, predicate);
                if (stageName === clientStage) {
                    assert.ok(serverMatch,
                        `FAIL: fixture "${name}" clientStage="${clientStage}" but STAGE_QUERIES.${stageName} does not match doc ${JSON.stringify(doc)}`);
                } else {
                    assert.ok(!serverMatch,
                        `FAIL: fixture "${name}" classified as "${clientStage}" but ALSO matches STAGE_QUERIES.${stageName} → predicate ambiguous`);
                }
            }
        });
    }
});

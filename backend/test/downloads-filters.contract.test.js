/* eslint-disable no-undef */
const assert = require('assert');
const { STAGE_QUERIES } = require('../utils/downloads-filters');
const { matchesPredicate } = require('./helpers/mongo-predicate');

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
        { name: 'paused+finished+error→paused',    doc: { paused: true, finished: true, error: 'x' } },
        { name: 'cancelled+finished+error→cancelled', doc: { cancelled: true, finished: true, error: 'x' } },
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

    it('every stage has at least one fixture classifying to it', function() {
        const hit = new Set(fixtures.map(f => deriveStage(f.doc)));
        for (const stage of Object.keys(STAGE_QUERIES)) {
            assert.ok(hit.has(stage),
                `no fixture exercises stage "${stage}" — add one or remove the stage`);
        }
    });
});

'use strict';

// Each STAGE_QUERIES entry is a Mongo predicate over raw download fields.
// Keep in sync with DownloadsComponent.deriveStage() in
// src/app/components/downloads/downloads.component.ts (lines ~804-812).
// The contract test in downloads-filters.contract.test.js pins both sides
// to the same truth (added in Task 4).
const STAGE_QUERIES = Object.freeze({
    cancelled:             { cancelled: true },
    paused:                { paused: true,  cancelled: { $ne: true } },
    errored:               { finished: true,  error: { $ne: null }, cancelled: { $ne: true }, paused: { $ne: true } },
    complete:              { finished: true,  error: null,           cancelled: { $ne: true }, paused: { $ne: true } },
    'active-creating':     { finished: false, cancelled: { $ne: true }, paused: { $ne: true }, step_index: 0 },
    'active-getting-info': { finished: false, cancelled: { $ne: true }, paused: { $ne: true }, step_index: 1 },
    'active-downloading':  { finished: false, cancelled: { $ne: true }, paused: { $ne: true }, step_index: { $gte: 2 } },
});

/**
 * Build a Mongo predicate for the title regex, or null when the input is
 * empty OR invalid. Invalid = match-all, preserving the client's existing
 * fallback semantics (downloads.component.ts:148 `catch { return true }`).
 *
 * The try/catch here is the documented fallback: invalid regex → null → no
 * filter applied → match-all. This matches the prior client behavior.
 */
function buildTitleFilter(regexStr) {
    if (!regexStr) return null;
    try {
        new RegExp(regexStr); // validate only; we don't use the object
    } catch {
        return null; // documented match-all fallback (invalid regex)
    }
    return { title: { $regex: regexStr, $options: 'i' } };
}

function buildStageFilter(stages) {
    if (!Array.isArray(stages) || stages.length === 0) return null;
    const selected = stages.map(s => STAGE_QUERIES[s]).filter(Boolean);
    if (selected.length === 0) return null;
    return { $or: selected };
}

/**
 * Converts ms (client) to seconds (backend field). Mirrors
 * downloads.component.ts:157-159 which compares download.timestamp_start * 1000.
 */
function buildDateFilter(range) {
    if (!range || (range.from == null && range.to == null)) return null;
    const out = {};
    if (range.from != null) out.$gte = Math.floor(range.from / 1000);
    if (range.to != null)   out.$lte = Math.floor(range.to / 1000);
    return { timestamp_start: out };
}

/**
 * N/A bucket catches downloads with null/undefined sub_name (client maps missing
 * to 'N/A' at downloads.component.ts:163). When user filters by 'N/A', we include
 * null in the $in so Mongo matches both null and missing field.
 */
function buildSubsFilter(subs) {
    if (!Array.isArray(subs) || subs.length === 0) return null;
    const values = subs.includes('N/A') ? [...subs, null] : subs;
    return { sub_name: { $in: values } };
}

function buildDownloadQuery(user_uid, filters) {
    const q = { user_uid };
    const parts = [
        buildTitleFilter(filters.titleRegex),
        buildStageFilter(filters.progressStages),
        buildDateFilter(filters.dateRange),
        buildSubsFilter(filters.subscriptions),
    ].filter(Boolean);
    if (parts.length > 0) q.$and = parts;
    return q;
}

module.exports = {
    STAGE_QUERIES,
    buildTitleFilter,
    buildStageFilter,
    buildDateFilter,
    buildSubsFilter,
    buildDownloadQuery,
};

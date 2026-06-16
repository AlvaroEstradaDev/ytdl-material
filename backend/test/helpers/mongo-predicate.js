'use strict';

// Pure in-JS predicate matcher replicating how Mongo evaluates a query doc,
// sufficient for the field shapes used in STAGE_QUERIES and the download filter
// translators. Supports literals, null, and operators: $ne, $gte, $lte, $in, $nin, $not.
//
// Normalizes missing fields to null — matches Mongo's behavior where missing ==
// null for these operators.
function matchesPredicate(doc, pred) {
    for (const [key, cond] of Object.entries(pred)) {
        const raw = doc[key];
        const v = raw === undefined ? null : raw;
        if (cond === null) {
            if (v !== null) return false;
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
                if (matchesPredicate(doc, { [key]: operand })) return false;
            }
            else throw new Error(`Unsupported op in matchesPredicate: ${op}`);
        }
    }
    return true;
}

module.exports = { matchesPredicate };

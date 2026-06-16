/* eslint-disable no-undef */
const assert = require('assert');
const subscriptionsModule = require('../subscriptions');
const downloaderModule = require('../downloader');
const logger = require('../logger');

function withWarnCapture(fn) {
    const messages = [];
    const original = logger.warn;
    logger.warn = (msg, ...rest) => { messages.push(`${msg} ${rest.join(' ')}`); };
    let result;
    try {
        result = fn();
    } finally {
        logger.warn = original;
    }
    return Promise.resolve(result).then(() => messages);
}

describe('parseDelimitedArgs warn-on-glued-flags', function() {
    it('returns identical array regardless of warn state (no mutation)', function() {
        const input = '--audio-quality 0 --match-filter,,title~=(asmr|ASMR|Asmr)';
        const expected = ['--audio-quality 0 --match-filter', 'title~=(asmr|ASMR|Asmr)'];
        assert.deepStrictEqual(subscriptionsModule.parseDelimitedArgs(input), expected);
        assert.deepStrictEqual(downloaderModule.parseDelimitedArgs(input), expected);
    });

    it('emits exactly one warn for a glued-flag token (subscriptions)', async function() {
        const input = '--audio-quality 0 --match-filter,,title~=(asmr|ASMR|Asmr)';
        const msgs = await withWarnCapture(() => {
            subscriptionsModule.parseDelimitedArgs(input, {sub_name: 'FrivolousFoxASMR'});
        });
        const matched = msgs.filter(m => m.includes('may glue multiple flags') && m.includes('FrivolousFoxASMR'));
        assert.strictEqual(matched.length, 1, `expected 1 warn, got: ${JSON.stringify(msgs)}`);
    });

    it('emits exactly one warn for a glued-flag token (downloader)', async function() {
        const input = '--audio-quality 0 --match-filter,,title~=(asmr|ASMR|Asmr)';
        const msgs = await withWarnCapture(() => {
            downloaderModule.parseDelimitedArgs(input, {sub_name: 'FrivolousFoxASMR'});
        });
        const matched = msgs.filter(m => m.includes('may glue multiple flags') && m.includes('FrivolousFoxASMR'));
        assert.strictEqual(matched.length, 1, `expected 1 warn, got: ${JSON.stringify(msgs)}`);
    });

    it('does not warn for correctly-delimited args', async function() {
        const input = '--audio-quality,,0,,--match-filter,,title~=x';
        const msgs = await withWarnCapture(() => {
            subscriptionsModule.parseDelimitedArgs(input, {sub_name: 'GoodSub'});
        });
        const matched = msgs.filter(m => m.includes('may glue multiple flags'));
        assert.strictEqual(matched.length, 0, `unexpected warn(s): ${JSON.stringify(msgs)}`);
    });

    it('does not warn for legit filter value containing a space', async function() {
        const input = '--match-filter title~=(foo bar)';
        const msgs = await withWarnCapture(() => {
            subscriptionsModule.parseDelimitedArgs(input, {sub_name: 'GoodSub'});
        });
        const matched = msgs.filter(m => m.includes('may glue multiple flags'));
        assert.strictEqual(matched.length, 0, `unexpected warn(s): ${JSON.stringify(msgs)}`);
    });

    it('falls back to "unknown" when sub_name not provided', async function() {
        const input = '--audio-quality 0 --match-filter';
        const msgs = await withWarnCapture(() => {
            subscriptionsModule.parseDelimitedArgs(input);
        });
        const matched = msgs.filter(m => m.includes('(subscription: unknown)'));
        assert.strictEqual(matched.length, 1);
    });

    it('returns empty array for empty/non-string input and warns nothing', async function() {
        const msgs = await withWarnCapture(() => {
            assert.deepStrictEqual(subscriptionsModule.parseDelimitedArgs(''), []);
            assert.deepStrictEqual(subscriptionsModule.parseDelimitedArgs(undefined), []);
            assert.deepStrictEqual(subscriptionsModule.parseDelimitedArgs(null), []);
        });
        const matched = msgs.filter(m => m.includes('may glue multiple flags'));
        assert.strictEqual(matched.length, 0);
    });
});

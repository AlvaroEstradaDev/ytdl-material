/* eslint-disable no-undef */
const assert = require('assert');
const loggerModule = require('../logger');

describe('Logger precedence helper', function() {
    it('returns null for empty config level (env-derived startup level must survive)', function() {
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel(undefined), null);
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel(null), null);
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel(''), null);
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel('   '), null);
    });

    it('normalizes and returns valid config levels', function() {
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel('warn'), 'warn');
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel('DEBUG'), 'debug');
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel('  verbose  '), 'verbose');
    });

    it('maps "warning" to "warn"', function() {
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel('warning'), 'warn');
    });

    it('returns null for invalid config level (caller skips, startup level survives)', function() {
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel('verbose-thing'), null);
        assert.strictEqual(loggerModule.resolveConfigLoggerLevel('trace'), null);
    });
});

/* eslint-disable no-undef */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { detectFormat, convertToNetscape } = require('../cookie-converter');

describe('Cookie Converter', function() {

    describe('Format Detection', function() {
        it('detects Cookie Quick Manager format', function() {
            const data = [{ 'Host raw': 'https://.youtube.com/', 'Name raw': 'GPS' }];
            assert.strictEqual(detectFormat(data), 'cookie-quick-manager');
        });

        it('detects EditThisCookie format', function() {
            const data = [{ domain: '.youtube.com', name: 'GPS', value: '1', expirationDate: 12345, secure: true, httpOnly: false, hostOnly: false, session: false, path: '/' }];
            assert.strictEqual(detectFormat(data), 'edit-this-cookie');
        });

        it('detects Cookie Editor format (same as EditThisCookie)', function() {
            const data = [{ name: 'GPS', value: '1', domain: '.youtube.com', hostOnly: false, path: '/', secure: true, httpOnly: false, session: false, sameSite: null, expirationDate: 12345, storeId: null }];
            assert.strictEqual(detectFormat(data), 'edit-this-cookie');
        });

        it('detects CDP/Puppeteer format', function() {
            const data = [{ name: 'GPS', value: '1', domain: '.youtube.com', path: '/', expires: 12345, size: 10, httpOnly: false, secure: true, sameSite: 'None' }];
            assert.strictEqual(detectFormat(data), 'cdp');
        });

        it('throws on unrecognized format', function() {
            const data = [{ unknown: 'field' }];
            assert.throws(() => detectFormat(data), /Unsupported cookie format/);
        });

        it('throws on empty array', function() {
            assert.throws(() => detectFormat([]), /No cookies found/);
        });
    });

    describe('Cookie Quick Manager Conversion', function() {
        it('converts Cookie Quick Manager example file to valid Netscape', function() {
            const jsonPath = path.resolve(__dirname, './fixtures/cookies-cqm.json');
            const jsonArray = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const result = convertToNetscape(jsonArray);
            const lines = result.trim().split('\n');
            assert.ok(lines.length > 0, 'should produce at least one line');

            const firstCookieLine = lines.find(l => l.includes('\t'));
            const cols = firstCookieLine.split('\t');
            assert.strictEqual(cols.length, 7, 'each line must have 7 tab-separated columns');
            assert.ok(cols[0].includes('example.com'), 'domain should contain example.com');
            assert.ok(['TRUE', 'FALSE'].includes(cols[1]), 'subdomain flag must be TRUE or FALSE');
            assert.strictEqual(cols[2], '/', 'path should be /');
            assert.ok(['TRUE', 'FALSE'].includes(cols[3]), 'secure flag must be TRUE or FALSE');
        });

        it('strips protocol and trailing slash from Host raw', function() {
            const data = [{
                'Host raw': 'https://.youtube.com/',
                'Name raw': 'test',
                'Content raw': 'val',
                'Path raw': '/',
                'Expires raw': 0,
                'Send for raw': true,
                'HTTP only raw': 'false',
                'This domain only raw': false,
                'SameSite raw': 'unspecified',
                'Store raw': 'firefox-default',
                'First Party Domain': ''
            }];
            const result = convertToNetscape(data);
            const cols = result.trim().split('\n').find(l => l.includes('\t')).split('\t');
            assert.strictEqual(cols[0], '.youtube.com');
        });

        it('handles session cookies (Expires raw = 0)', function() {
            const data = [{
                'Host raw': 'http://.youtube.com/',
                'Name raw': 'sess',
                'Content raw': 'abc',
                'Path raw': '/',
                'Expires raw': 0,
                'Send for raw': false,
                'HTTP only raw': 'false',
                'This domain only raw': false,
                'SameSite raw': 'unspecified',
                'Store raw': 'firefox-default',
                'First Party Domain': ''
            }];
            const result = convertToNetscape(data);
            const cols = result.trim().split('\t');
            assert.strictEqual(cols[4], '0');
        });
    });

    describe('EditThisCookie / Cookie Editor Conversion', function() {
        it('converts EditThisCookie format correctly', function() {
            const data = [{
                domain: '.youtube.com',
                hostOnly: false,
                path: '/',
                secure: true,
                httpOnly: true,
                session: false,
                expirationDate: 1735689600,
                name: 'SID',
                value: 'abc123',
                sameSite: 'no_restriction',
                storeId: '0',
                id: 1
            }];
            const result = convertToNetscape(data);
            const cols = result.trim().split('\n').find(l => l.includes('\t')).split('\t');
            assert.strictEqual(cols[0], '.youtube.com');
            assert.strictEqual(cols[1], 'TRUE');
            assert.strictEqual(cols[2], '/');
            assert.strictEqual(cols[3], 'TRUE');
            assert.strictEqual(cols[4], '1735689600');
            assert.strictEqual(cols[5], 'SID');
            assert.strictEqual(cols[6], 'abc123');
        });

        it('handles session cookies (no expirationDate)', function() {
            const data = [{
                domain: '.youtube.com',
                hostOnly: false,
                path: '/',
                secure: false,
                httpOnly: false,
                session: true,
                name: 'sess',
                value: 'xyz'
            }];
            const result = convertToNetscape(data);
            const cols = result.trim().split('\t');
            assert.strictEqual(cols[4], '0');
        });

        it('handles hostOnly cookies', function() {
            const data = [{
                domain: 'youtube.com',
                hostOnly: true,
                path: '/',
                secure: false,
                httpOnly: false,
                session: false,
                expirationDate: 1735689600,
                name: 'test',
                value: 'val'
            }];
            const result = convertToNetscape(data);
            const cols = result.trim().split('\t');
            assert.strictEqual(cols[1], 'FALSE');
        });
    });

    describe('CDP/Puppeteer Conversion', function() {
        it('converts CDP format correctly', function() {
            const data = [{
                name: 'SID',
                value: 'abc123',
                domain: '.youtube.com',
                path: '/',
                expires: 1735689600,
                size: 42,
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                priority: 'Medium',
                sameParty: false,
                sourceScheme: 'Secure',
                sourcePort: 443
            }];
            const result = convertToNetscape(data);
            const cols = result.trim().split('\n').find(l => l.includes('\t')).split('\t');
            assert.strictEqual(cols[0], '.youtube.com');
            assert.strictEqual(cols[1], 'TRUE');
            assert.strictEqual(cols[3], 'TRUE');
            assert.strictEqual(cols[4], '1735689600');
            assert.strictEqual(cols[5], 'SID');
            assert.strictEqual(cols[6], 'abc123');
        });

        it('handles session cookies (expires = -1)', function() {
            const data = [{
                name: 'sess',
                value: 'val',
                domain: '.youtube.com',
                path: '/',
                expires: -1,
                size: 10,
                httpOnly: false,
                secure: false,
                sameSite: 'Lax'
            }];
            const result = convertToNetscape(data);
            const cols = result.trim().split('\t');
            assert.strictEqual(cols[4], '0');
        });

        it('infers hostOnly from missing leading dot', function() {
            const data = [{
                name: 'test',
                value: 'val',
                domain: 'youtube.com',
                path: '/',
                expires: 1735689600,
                size: 10,
                httpOnly: false,
                secure: false,
                sameSite: 'Strict'
            }];
            const result = convertToNetscape(data);
            const cols = result.trim().split('\t');
            assert.strictEqual(cols[1], 'FALSE');
        });
    });

    describe('convertToNetscape validation', function() {
        it('throws on non-array input', function() {
            assert.throws(() => convertToNetscape('not array'), /No cookies found/);
        });

        it('throws on empty array', function() {
            assert.throws(() => convertToNetscape([]), /No cookies found/);
        });

        it('produces output matching Netscape format against fixture', function() {
            const jsonPath = path.resolve(__dirname, 'fixtures/cookies-cqm.json');
            const txtPath = path.resolve(__dirname, 'fixtures/cookies-cqm.txt');
            const jsonArray = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const result = convertToNetscape(jsonArray);
            const expected = fs.readFileSync(txtPath, 'utf8').replace(/\r?\n$/, '');
            const actual = result.replace(/\r?\n$/, '');
            assert.strictEqual(actual, expected, 'converted output should match fixture exactly');
        });

        it('includes Netscape header as first line', function() {
            const data = [{
                domain: '.youtube.com',
                hostOnly: false,
                path: '/',
                secure: true,
                session: false,
                expirationDate: 1735689600,
                name: 'SID',
                value: 'v'
            }];
            const result = convertToNetscape(data);
            const firstLine = result.split('\n')[0];
            assert.strictEqual(firstLine, '# Netscape HTTP Cookie File');
        });

        it('handles blank line between header and cookies (Netscape spec)', function() {
            const data = [{
                domain: '.youtube.com',
                hostOnly: false,
                path: '/',
                secure: true,
                session: false,
                expirationDate: 1735689600,
                name: 'SID',
                value: 'v'
            }];
            const result = convertToNetscape(data);
            const lines = result.split('\n');
            assert.strictEqual(lines[0], '# Netscape HTTP Cookie File');
        });
    });

    describe('Subdomain flag derived from domain (not source metadata)', function() {
        it('Cookie Quick Manager: dotted domain with "This domain only raw: true" still yields TRUE flag', function() {
            const data = [{
                'Host raw': 'https://.youtube.com/',
                'Name raw': 'SID',
                'Content raw': 'v',
                'Path raw': '/',
                'Expires raw': 1735689600,
                'Send for raw': true,
                'HTTP only raw': 'false',
                'This domain only raw': true,
                'SameSite raw': 'unspecified',
                'Store raw': 'firefox-default',
                'First Party Domain': ''
            }];
            const result = convertToNetscape(data);
            const cookieLine = result.split('\n').find(l => l.includes('SID'));
            const cols = cookieLine.split('\t');
            assert.strictEqual(cols[0], '.youtube.com');
            assert.strictEqual(cols[1], 'TRUE', 'dotted domain MUST have TRUE flag regardless of source metadata');
        });

        it('Cookie Quick Manager: non-dotted domain yields FALSE flag', function() {
            const data = [{
                'Host raw': 'https://youtube.com/',
                'Name raw': 'SID',
                'Content raw': 'v',
                'Path raw': '/',
                'Expires raw': 1735689600,
                'Send for raw': true,
                'HTTP only raw': 'false',
                'This domain only raw': false,
                'SameSite raw': 'unspecified',
                'Store raw': 'firefox-default',
                'First Party Domain': ''
            }];
            const result = convertToNetscape(data);
            const cookieLine = result.split('\n').find(l => l.includes('SID'));
            const cols = cookieLine.split('\t');
            assert.strictEqual(cols[0], 'youtube.com');
            assert.strictEqual(cols[1], 'FALSE');
        });

        it('EditThisCookie: dotted domain with hostOnly=true still yields TRUE flag', function() {
            const data = [{
                domain: '.youtube.com',
                hostOnly: true,
                path: '/',
                secure: true,
                session: false,
                expirationDate: 1735689600,
                name: 'SID',
                value: 'v'
            }];
            const result = convertToNetscape(data);
            const cookieLine = result.split('\n').find(l => l.includes('SID'));
            const cols = cookieLine.split('\t');
            assert.strictEqual(cols[0], '.youtube.com');
            assert.strictEqual(cols[1], 'TRUE', 'dotted domain MUST have TRUE flag regardless of hostOnly');
        });
    });

    describe('Expiration handling', function() {
        it('Cookie Quick Manager: decimal Expires raw is floored to integer', function() {
            const data = [{
                'Host raw': 'https://.youtube.com/',
                'Name raw': 'GPS',
                'Content raw': '1',
                'Path raw': '/',
                'Expires raw': 1767900822.205,
                'Send for raw': true,
                'HTTP only raw': 'false',
                'This domain only raw': false,
                'SameSite raw': 'unspecified',
                'Store raw': 'firefox-default',
                'First Party Domain': ''
            }];
            const result = convertToNetscape(data);
            const cookieLine = result.split('\n').find(l => l.includes('GPS'));
            const cols = cookieLine.split('\t');
            assert.strictEqual(cols[4], '1767900822', 'decimal expiration must be floored to integer');
        });
    });
});

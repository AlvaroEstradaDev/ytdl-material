const FORMATS = {
    COOKIE_QUICK_MANAGER: 'cookie-quick-manager',
    EDIT_THIS_COOKIE: 'edit-this-cookie',
    CDP: 'cdp',
};

function detectFormat(jsonArray) {
    if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
        throw new Error('No cookies found in file.');
    }
    const first = jsonArray[0];
    if (first['Host raw']) return FORMATS.COOKIE_QUICK_MANAGER;
    if (first.hostOnly !== undefined || first.session !== undefined || first.expirationDate !== undefined) return FORMATS.EDIT_THIS_COOKIE;
    if (first.expires !== undefined && first.size !== undefined) return FORMATS.CDP;
    throw new Error('Unsupported cookie format. Supported: EditThisCookie, Cookie Editor, Cookie Quick Manager, Puppeteer/Playwright');
}

const NETSCAPE_HEADER = '# Netscape HTTP Cookie File';

function deriveIncludeSubdomains(domain) {
    return (typeof domain === 'string' && domain.startsWith('.')) ? 'TRUE' : 'FALSE';
}

function normalizeEditThisCookie(entry) {
    const domain = (entry.domain || '').trim();
    const isSession = entry.session === true || entry.expirationDate === undefined;
    return {
        domain,
        includeSubdomains: deriveIncludeSubdomains(domain),
        path: entry.path || '/',
        secure: entry.secure ? 'TRUE' : 'FALSE',
        expiry: isSession ? '0' : String(Math.floor(entry.expirationDate || 0)),
        name: entry.name || '',
        value: entry.value || '',
    };
}

function normalizeCookieQuickManager(entry) {
    const host = (entry['Host raw'] || '')
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
    const domain = host;
    const expiryRaw = entry['Expires raw'];
    const isSession = expiryRaw === 0 || expiryRaw === '0';
    return {
        domain,
        includeSubdomains: deriveIncludeSubdomains(domain),
        path: entry['Path raw'] || '/',
        secure: entry['Send for raw'] ? 'TRUE' : 'FALSE',
        expiry: isSession ? '0' : String(Math.floor(Number(expiryRaw) || 0)),
        name: entry['Name raw'] || '',
        value: entry['Content raw'] || '',
    };
}

function normalizeCDP(entry) {
    const hasLeadingDot = (entry.domain || '').startsWith('.');
    const isSession = entry.expires === -1 || entry.expires === 0 || entry.expires === undefined;
    return {
        domain: (entry.domain || '').trim(),
        includeSubdomains: hasLeadingDot ? 'TRUE' : 'FALSE',
        path: entry.path || '/',
        secure: entry.secure ? 'TRUE' : 'FALSE',
        expiry: isSession ? '0' : String(Math.floor(entry.expires)),
        name: entry.name || '',
        value: entry.value || '',
    };
}

function toNetscapeLine(normalized) {
    return [
        normalized.domain,
        normalized.includeSubdomains,
        normalized.path,
        normalized.secure,
        normalized.expiry,
        normalized.name,
        normalized.value,
    ].join('\t');
}

function convertToNetscape(jsonArray) {
    const format = detectFormat(jsonArray);
    const normalizers = {
        [FORMATS.EDIT_THIS_COOKIE]: normalizeEditThisCookie,
        [FORMATS.COOKIE_QUICK_MANAGER]: normalizeCookieQuickManager,
        [FORMATS.CDP]: normalizeCDP,
    };
    const normalize = normalizers[format];
    const lines = [NETSCAPE_HEADER];
    for (const entry of jsonArray) {
        lines.push(toNetscapeLine(normalize(entry)));
    }
    return lines.join('\n') + '\n';
}

module.exports = { detectFormat, convertToNetscape, normalizeEditThisCookie, normalizeCookieQuickManager, normalizeCDP };

"""
Keyword-based bug severity classifier.

Used as a fallback when the Claude API is unavailable (no ANTHROPIC_API_KEY,
network error, rate limit, etc.). Preserves the original behaviour the
microservice shipped with so existing dev setups still work without an API key.
"""

CRITICAL_KEYWORDS = [
    'crash', 'null pointer', 'nullpointerexception', 'segfault', 'segmentation fault',
    'data loss', 'data corruption', 'database corruption', 'unrecoverable',
    'system down', 'production down', 'outage', 'exception', 'fatal',
    'memory leak', 'heap overflow', 'stack overflow',
]

HIGH_KEYWORDS = [
    'error', 'fail', 'failure', 'failed', 'broken', 'not working',
    'incorrect', 'wrong result', 'unexpected behavior', 'regression',
    'security', 'vulnerability', 'exploit', 'injection', 'xss',
    'unauthorized', 'forbidden', '500', 'internal server error',
]

MEDIUM_KEYWORDS = [
    'slow', 'timeout', 'delay', 'performance', 'lag', 'unresponsive',
    'loading', 'memory usage', 'high cpu', 'degraded', 'intermittent',
    'flaky', 'occasionally', 'sometimes fails',
]

TAG_KEYWORDS = {
    'frontend':    ['ui', 'frontend', 'react', 'css', 'html', 'display', 'render', 'layout'],
    'backend':     ['api', 'backend', 'server', 'endpoint', 'route', 'controller'],
    'database':    ['database', 'db', 'query', 'mongo', 'sql', 'migration', 'schema'],
    'auth':        ['login', 'auth', 'token', 'jwt', 'session', 'password', 'unauthorized'],
    'performance': ['slow', 'timeout', 'performance', 'lag', 'delay', 'memory', 'cpu'],
    'security':    ['security', 'vulnerability', 'exploit', 'xss', 'injection', 'csrf'],
    'crash':       ['crash', 'exception', 'fatal', 'null pointer', 'segfault'],
    'network':     ['network', 'http', 'request', 'response', 'cors', 'fetch', 'axios'],
}


def classify_severity(title: str, description: str) -> str:
    text = (title + ' ' + description).lower()
    for kw in CRITICAL_KEYWORDS:
        if kw in text:
            return 'critical'
    for kw in HIGH_KEYWORDS:
        if kw in text:
            return 'high'
    for kw in MEDIUM_KEYWORDS:
        if kw in text:
            return 'medium'
    return 'low'


def extract_tags(title: str, description: str) -> list:
    text = (title + ' ' + description).lower()
    tags = [tag for tag, kws in TAG_KEYWORDS.items() if any(kw in text for kw in kws)]
    return tags if tags else ['general']


def generate_summary(title: str, description: str, severity: str) -> str:
    short_desc = description[:100] + '…' if len(description) > 100 else description
    return f"[{severity.upper()}] {title} — {short_desc}" if short_desc else f"[{severity.upper()}] {title}"


def analyze(title: str, description: str) -> dict:
    """Run the full keyword pipeline and return the standard response shape."""
    severity = classify_severity(title, description)
    return {
        'severity':       severity,
        'suggested_tags': extract_tags(title, description),
        'summary':        generate_summary(title, description, severity),
        'source':         'keyword',
    }

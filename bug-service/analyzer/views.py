from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


# Keyword sets for severity classification
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


def classify_severity(title: str, description: str) -> str:
    """
    Classify bug severity based on keyword matching.
    Returns: 'critical', 'high', 'medium', or 'low'
    """
    text = (title + ' ' + description).lower()

    for keyword in CRITICAL_KEYWORDS:
        if keyword in text:
            return 'critical'

    for keyword in HIGH_KEYWORDS:
        if keyword in text:
            return 'high'

    for keyword in MEDIUM_KEYWORDS:
        if keyword in text:
            return 'medium'

    return 'low'


def extract_tags(title: str, description: str) -> list:
    """
    Extract relevant tags from the bug title and description.
    """
    text = (title + ' ' + description).lower()
    tags = []

    tag_keywords = {
        'frontend': ['ui', 'frontend', 'react', 'css', 'html', 'display', 'render', 'layout'],
        'backend': ['api', 'backend', 'server', 'endpoint', 'route', 'controller'],
        'database': ['database', 'db', 'query', 'mongo', 'sql', 'migration', 'schema'],
        'auth': ['login', 'auth', 'token', 'jwt', 'session', 'password', 'unauthorized'],
        'performance': ['slow', 'timeout', 'performance', 'lag', 'delay', 'memory', 'cpu'],
        'security': ['security', 'vulnerability', 'exploit', 'xss', 'injection', 'csrf'],
        'crash': ['crash', 'exception', 'fatal', 'null pointer', 'segfault'],
        'network': ['network', 'http', 'request', 'response', 'cors', 'fetch', 'axios'],
    }

    for tag, keywords in tag_keywords.items():
        if any(kw in text for kw in keywords):
            tags.append(tag)

    return tags if tags else ['general']


def generate_summary(title: str, description: str, severity: str) -> str:
    """
    Generate a brief summary of the bug report.
    """
    short_desc = description[:100] + '...' if len(description) > 100 else description
    if short_desc:
        return f"[{severity.upper()}] {title} — {short_desc}"
    return f"[{severity.upper()}] {title}"


class BugAnalyzeView(APIView):
    """
    POST /api/analyze
    Accepts: { "title": "...", "description": "..." }
    Returns: { "severity": "...", "suggested_tags": [...], "summary": "..." }
    """

    def post(self, request):
        title = request.data.get('title', '')
        description = request.data.get('description', '')

        if not title and not description:
            return Response(
                {'error': 'title or description is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        severity = classify_severity(title, description)
        suggested_tags = extract_tags(title, description)
        summary = generate_summary(title, description, severity)

        return Response({
            'severity': severity,
            'suggested_tags': suggested_tags,
            'summary': summary,
        })

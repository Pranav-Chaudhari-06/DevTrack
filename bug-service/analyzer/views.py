from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from . import keyword, llm


class BugAnalyzeView(APIView):
    """
    POST /api/analyze
    Accepts: { "title": "...", "description": "..." }
    Returns: { "severity": "...", "suggested_tags": [...], "summary": "...", "source": "llm"|"keyword" }

    Tries the Claude-backed analyzer first; falls back to keyword classification
    on any failure (missing key, API error, rate limit, malformed response) so
    bug creation is never blocked by the analysis layer.
    """

    def post(self, request):
        title = request.data.get('title', '')
        description = request.data.get('description', '')

        if not title and not description:
            return Response(
                {'error': 'title or description is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = llm.analyze(title, description) or keyword.analyze(title, description)
        return Response(result)

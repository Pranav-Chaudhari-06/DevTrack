"""
Claude-powered bug analyzer.

Calls Claude Haiku 4.5 with a JSON-schema-constrained response so the output
is always shape-correct without us having to validate it ourselves. Returns
None on any failure (missing key, network error, rate limit, malformed JSON)
so the caller can fall back to the keyword classifier.
"""

import json
import logging
import os

logger = logging.getLogger(__name__)

# Lazily-imported so installs without the SDK still boot; we only need it if
# ANTHROPIC_API_KEY is set.
try:
    import anthropic
except ImportError:  # pragma: no cover
    anthropic = None

MODEL = 'claude-haiku-4-5'

# Stable system prompt. cache_control below marks it as cacheable; Haiku 4.5
# has a 4096-token minimum cacheable prefix, so at this length the marker is
# effectively a no-op — it costs nothing and starts paying off if the rubric
# grows past the threshold.
SYSTEM_PROMPT = """You are a bug triage classifier for DevTrack, a developer task-and-bug tracking tool. You receive bug reports as a title and description, and you return a structured JSON analysis.

# Severity rubric

Choose exactly one severity level using these definitions:

- **critical**: System-down, data-loss, security breach, or unrecoverable crashes affecting all users. Examples: "Production database is corrupted", "All users locked out after deploy", "Payments charging twice".
- **high**: Major functional break for many users; obvious bug with no workaround; significant security or correctness issue. Examples: "Login fails with 500 error", "XSS vulnerability in comment field", "Export returns empty file".
- **medium**: Bug with a workaround, performance degradation, intermittent failure, or impacts a subset of users. Examples: "Dashboard loads slowly on Firefox", "Date picker occasionally shows wrong timezone", "Search misses results with apostrophes".
- **low**: Cosmetic, minor UX, edge cases, typos, or nice-to-have improvements. Examples: "Button text is slightly misaligned", "Error message has a typo", "Tooltip uses wrong icon".

When in doubt between two adjacent levels, choose the lower one. Severity is about blast radius and user impact, not how hard the bug is to fix.

# Tagging

Pick 1-4 tags that best describe the affected area. Prefer these canonical tags when they fit; introduce a new tag only if none apply:

- frontend, backend, database, auth, performance, security, crash, network, mobile, accessibility, api, ui, deployment, config

# Summary

Write a single concise sentence (≤ 140 chars) that captures the essence of the bug. Lead with the severity in brackets. Format: `[SEVERITY] <one-line summary>`.

# Output

Respond with valid JSON matching the schema. No prose before or after."""

OUTPUT_SCHEMA = {
    'type': 'object',
    'properties': {
        'severity':       {'type': 'string', 'enum': ['low', 'medium', 'high', 'critical']},
        'suggested_tags': {'type': 'array', 'items': {'type': 'string'}, 'minItems': 1, 'maxItems': 6},
        'summary':        {'type': 'string'},
    },
    'required': ['severity', 'suggested_tags', 'summary'],
    'additionalProperties': False,
}

_client = None


def _get_client():
    """Lazy-init the Anthropic client. Returns None if SDK / key are absent."""
    global _client
    if _client is not None:
        return _client
    if anthropic is None or not os.environ.get('ANTHROPIC_API_KEY'):
        return None
    # Short timeout so a slow API never blocks bug creation upstream; one retry
    # smooths over transient blips without compounding latency.
    _client = anthropic.Anthropic(timeout=8.0, max_retries=1)
    return _client


def analyze(title: str, description: str):
    """
    Returns the standard response dict on success, or None on any failure
    (no API key, network error, rate limit, schema mismatch, JSON error).
    """
    client = _get_client()
    if client is None:
        return None

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=512,
            system=[{
                'type': 'text',
                'text': SYSTEM_PROMPT,
                'cache_control': {'type': 'ephemeral'},
            }],
            messages=[{
                'role': 'user',
                'content': f'Title: {title}\n\nDescription: {description or "(none provided)"}',
            }],
            output_config={
                'format': {'type': 'json_schema', 'schema': OUTPUT_SCHEMA},
            },
        )
    except Exception as err:  # noqa: BLE001 — log + fall back; never bubble
        logger.warning('Claude analysis failed, falling back to keyword: %s', err)
        return None

    # Schema-constrained output is in the first text block; still defend against
    # the model returning no content (e.g. refusal stop_reason).
    text = next((b.text for b in response.content if b.type == 'text'), None)
    if not text:
        logger.warning('Claude returned no text content; falling back to keyword')
        return None

    try:
        data = json.loads(text)
    except json.JSONDecodeError as err:
        logger.warning('Claude returned invalid JSON despite schema: %s', err)
        return None

    data['source'] = 'llm'
    return data

export function tryParseJSON(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value);
  } catch {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function candidateFromText(value) {
  const parsed = tryParseJSON(value);
  if (!parsed) return null;
  if (parsed.response && typeof parsed.response === 'object') return parsed.response;
  return parsed;
}

function normalizeObjectCandidate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.response && typeof value.response === 'object') return value.response;
  return value;
}

function looksLikeKindLineObject(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.draft_response === 'string' &&
      typeof value.micro_skill === 'string' &&
      typeof value.support_move === 'string'
  );
}

export function extractStructuredResponse(modelResponse) {
  if (!modelResponse) return null;

  const objectCandidates = [
    normalizeObjectCandidate(modelResponse.response),
    normalizeObjectCandidate(modelResponse.result),
    normalizeObjectCandidate(modelResponse.output),
    normalizeObjectCandidate(modelResponse?.choices?.[0]?.message?.parsed),
    normalizeObjectCandidate(modelResponse?.choices?.[0]?.parsed),
    normalizeObjectCandidate(modelResponse?.parsed)
  ].filter(Boolean);

  for (const candidate of objectCandidates) {
    if (looksLikeKindLineObject(candidate)) return candidate;
  }

  const content = modelResponse?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        if (typeof part?.content === 'string') return part.content;
        return '';
      })
      .join('');

    const parsed = candidateFromText(text);
    if (looksLikeKindLineObject(parsed)) return parsed;
  }

  const textCandidates = [
    typeof content === 'string' ? content : null,
    typeof modelResponse?.choices?.[0]?.text === 'string' ? modelResponse.choices[0].text : null,
    typeof modelResponse?.response === 'string' ? modelResponse.response : null,
    typeof modelResponse?.text === 'string' ? modelResponse.text : null
  ].filter(Boolean);

  for (const text of textCandidates) {
    const parsed = candidateFromText(text);
    if (looksLikeKindLineObject(parsed)) return parsed;
  }

  return null;
}

function parseLooseJSON(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function tryParseJSON(value) {
  if (value && typeof value === 'object') return value;
  return parseLooseJSON(value);
}

function unwrapResponseObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  if (value.response && typeof value.response === 'object' && !Array.isArray(value.response)) {
    return value.response;
  }

  if (typeof value.response === 'string') {
    const nested = parseLooseJSON(value.response);
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  }

  return value;
}

function looksLikeKindLineObject(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof value.draft_response === 'string' &&
      typeof value.micro_skill === 'string' &&
      typeof value.support_move === 'string' &&
      typeof value.scope_note === 'string' &&
      Number.isFinite(Number(value.model_risk))
  );
}

function extractFromToolCalls(modelResponse) {
  const message = modelResponse?.choices?.[0]?.message;
  const toolArgs = message?.tool_calls?.[0]?.function?.arguments || message?.function_call?.arguments;
  if (typeof toolArgs !== 'string') return null;
  const parsed = parseLooseJSON(toolArgs);
  return looksLikeKindLineObject(parsed) ? parsed : null;
}

export function extractStructuredResponse(modelResponse) {
  if (!modelResponse) return null;

  const objectCandidates = [
    unwrapResponseObject(modelResponse.response),
    unwrapResponseObject(modelResponse.result),
    unwrapResponseObject(modelResponse.output),
    unwrapResponseObject(modelResponse?.choices?.[0]?.message?.parsed),
    unwrapResponseObject(modelResponse?.choices?.[0]?.parsed),
    unwrapResponseObject(modelResponse?.parsed)
  ].filter(Boolean);

  for (const candidate of objectCandidates) {
    if (looksLikeKindLineObject(candidate)) return candidate;
  }

  const fromTools = extractFromToolCalls(modelResponse);
  if (fromTools) return fromTools;

  const content = modelResponse?.choices?.[0]?.message?.content;
  const textCandidates = [
    typeof content === 'string' ? content : null,
    Array.isArray(content)
      ? content
          .map((part) => {
            if (typeof part === 'string') return part;
            if (typeof part?.text === 'string') return part.text;
            if (typeof part?.content === 'string') return part.content;
            return '';
          })
          .join('')
      : null,
    typeof modelResponse?.choices?.[0]?.text === 'string' ? modelResponse.choices[0].text : null,
    typeof modelResponse?.response === 'string' ? modelResponse.response : null,
    typeof modelResponse?.text === 'string' ? modelResponse.text : null
  ].filter(Boolean);

  for (const text of textCandidates) {
    const parsed = parseLooseJSON(text);
    const unwrapped = unwrapResponseObject(parsed);
    if (looksLikeKindLineObject(unwrapped)) return unwrapped;
  }

  return null;
}

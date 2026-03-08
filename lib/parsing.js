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

function cleanText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

export function tryParseJSON(value) {
  if (value && typeof value === 'object') return value;
  return parseLooseJSON(value);
}

function unwrapResponseObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.response && typeof value.response === 'object' && !Array.isArray(value.response)) return value.response;
  if (typeof value.response === 'string') {
    const nested = parseLooseJSON(value.response);
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  }
  return value;
}

function normalizeSupportMove(value) {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();
  if (['reflect', 'clarify', 'reframe', 'action'].includes(lowered)) return lowered;
  if (lowered.includes('reflect')) return 'reflect';
  if (lowered.includes('clar')) return 'clarify';
  if (lowered.includes('frame')) return 'reframe';
  if (lowered.includes('action') || lowered.includes('step')) return 'action';
  return null;
}

function coerceStructuredResponse(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const draft = [
    value.draft_response,
    value.response,
    value.reply,
    value.text,
    value.assistant_response,
    value.output
  ].find((item) => typeof item === 'string' && item.trim());

  if (!draft) return null;

  const numericRisk = Number(
    value.model_risk ?? value.self_risk ?? value.risk ?? value.risk_score ?? 0.25
  );

  return {
    draft_response: cleanText(draft),
    model_risk: Number.isFinite(numericRisk) ? Math.max(0, Math.min(1, numericRisk)) : 0.25,
    scope_note:
      typeof value.scope_note === 'string' && value.scope_note.trim()
        ? value.scope_note.trim()
        : 'Response kept inside the bounded support scope.',
    micro_skill:
      typeof value.micro_skill === 'string' && value.micro_skill.trim() ? value.micro_skill.trim() : null,
    support_move: normalizeSupportMove(value.support_move) || null
  };
}

function extractFromToolCalls(modelResponse) {
  const message = modelResponse?.choices?.[0]?.message;
  const toolArgs = message?.tool_calls?.[0]?.function?.arguments || message?.function_call?.arguments;
  if (typeof toolArgs !== 'string') return null;
  return coerceStructuredResponse(parseLooseJSON(toolArgs));
}

export function extractUsableText(modelResponse) {
  if (!modelResponse) return null;

  const candidates = [];

  if (typeof modelResponse?.response === 'string') candidates.push(modelResponse.response);
  if (typeof modelResponse?.result?.response === 'string') candidates.push(modelResponse.result.response);
  if (typeof modelResponse?.text === 'string') candidates.push(modelResponse.text);

  const content = modelResponse?.choices?.[0]?.message?.content;
  if (typeof content === 'string') candidates.push(content);
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        if (typeof part?.content === 'string') return part.content;
        return '';
      })
      .join('');
    if (joined.trim()) candidates.push(joined);
  }

  if (typeof modelResponse?.choices?.[0]?.text === 'string') candidates.push(modelResponse.choices[0].text);

  for (const candidate of candidates) {
    const cleaned = cleanText(candidate);
    if (cleaned) return cleaned;
  }

  return null;
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
    const coerced = coerceStructuredResponse(candidate);
    if (coerced) return coerced;
  }

  const fromTools = extractFromToolCalls(modelResponse);
  if (fromTools) return fromTools;

  const textCandidate = extractUsableText(modelResponse);
  if (!textCandidate) return null;

  const parsed = parseLooseJSON(textCandidate);
  const unwrapped = unwrapResponseObject(parsed);
  const coerced = coerceStructuredResponse(unwrapped);
  if (coerced) return coerced;

  return null;
}

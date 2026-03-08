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

export function extractStructuredResponse(modelResponse) {
  if (!modelResponse) return null;

  if (modelResponse.response && typeof modelResponse.response === 'object' && !Array.isArray(modelResponse.response)) {
    const nested = modelResponse.response;
    if (nested.draft_response) return nested;
    if (nested.response && typeof nested.response === 'object') return nested.response;
  }

  if (typeof modelResponse.response === 'string') {
    const parsed = tryParseJSON(modelResponse.response);
    if (parsed) return parsed.response || parsed;
  }

  const choiceContent = modelResponse?.choices?.[0]?.message?.content;
  if (Array.isArray(choiceContent)) {
    const text = choiceContent
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
    const parsed = tryParseJSON(text);
    if (parsed) return parsed.response || parsed;
  }

  if (typeof choiceContent === 'string') {
    const parsed = tryParseJSON(choiceContent);
    if (parsed) return parsed.response || parsed;
  }

  const choiceText = modelResponse?.choices?.[0]?.text;
  if (typeof choiceText === 'string') {
    const parsed = tryParseJSON(choiceText);
    if (parsed) return parsed.response || parsed;
  }

  return null;
}

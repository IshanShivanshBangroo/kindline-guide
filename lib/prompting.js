import { getIntervention } from './interventions.js';

const SUPPORT_MOVES = ['reflect', 'clarify', 'reframe', 'action'];

export function buildModelMessages({ interventionId, history }) {
  const intervention = getIntervention(interventionId);
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];

  const instruction = `You are KindLine Guide, a bounded reflective coping support tool.

Core response rules:
- Write one short paragraph under 95 words.
- Ask at most one question.
- Stay concrete and humane.
- Do not diagnose, prescribe, assess urgent symptoms, explain hidden motives as facts, or provide legal or emergency management advice.
- Keep the reply inside the active intervention.
- The JSON schema will control the output format. Fill it carefully.`;

  const fieldGuidance = `Field guidance:
- draft_response: the actual bounded supportive paragraph.
- model_risk: a conservative number from 0 to 1. Use a higher value if the request is outside scope or if you are unsure.
- scope_note: one short sentence explaining why the response stays inside scope.
- micro_skill: optional short skill label. Prefer one of [${intervention.microSkills.map((item) => `"${item}"`).join(', ')}].
- support_move: optional high-level move. Use one of [${SUPPORT_MOVES.map((item) => `"${item}"`).join(', ')}].`;

  const messages = [
    { role: 'system', content: intervention.systemPrompt },
    { role: 'system', content: instruction },
    { role: 'system', content: fieldGuidance }
  ];

  for (const item of recentHistory) {
    if (!item || typeof item.content !== 'string') continue;
    if (item.role !== 'user' && item.role !== 'assistant') continue;
    messages.push({ role: item.role, content: item.content.trim() });
  }

  return { intervention, messages };
}

export function buildRescueMessages({ interventionId, history }) {
  const intervention = getIntervention(interventionId);
  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];

  const messages = [
    {
      role: 'system',
      content: `${intervention.systemPrompt}\n\nReturn only one short paragraph under 95 words. No JSON. No bullet points. Ask at most one question. Stay inside scope.`
    }
  ];

  for (const item of recentHistory) {
    if (!item || typeof item.content !== 'string') continue;
    if (item.role !== 'user' && item.role !== 'assistant') continue;
    messages.push({ role: item.role, content: item.content.trim() });
  }

  return { intervention, messages };
}

import { getIntervention } from './interventions.js';

const SUPPORT_MOVES = ['reflect', 'clarify', 'reframe', 'action'];

export function buildModelMessages({ interventionId, history }) {
  const intervention = getIntervention(interventionId);
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];

  const outputContract = `Return exactly one JSON object and nothing else. Do not use markdown fences. Use this exact shape:
{
  "draft_response": string,
  "micro_skill": one of [${intervention.microSkills.map((item) => `"${item}"`).join(', ')}],
  "support_move": one of [${SUPPORT_MOVES.map((item) => `"${item}"`).join(', ')}],
  "model_risk": number between 0 and 1,
  "scope_note": string
}

Field rules:
- draft_response must be one paragraph under 95 words.
- micro_skill must match the actual move you used.
- support_move must be one of reflect, clarify, reframe, or action.
- model_risk must be conservative. If the user asks for diagnosis, medication, urgent symptom assessment, or anything clearly outside scope, set model_risk near 1.
- scope_note must briefly explain why the response stays inside scope.
- Never include extra keys.`;

  const instruction = `Additional response constraints:
- Use one paragraph.
- Ask at most one question.
- Do not give diagnosis, medication advice, hidden motive explanations, legal advice, or emergency management beyond encouraging immediate professional or crisis help when needed.
- Be concrete and humane.
- Do not use bullet points.`;

  const messages = [
    { role: 'system', content: intervention.systemPrompt },
    { role: 'system', content: outputContract },
    { role: 'system', content: instruction }
  ];

  for (const item of recentHistory) {
    if (!item || typeof item.content !== 'string') continue;
    if (item.role !== 'user' && item.role !== 'assistant') continue;
    messages.push({ role: item.role, content: item.content.trim() });
  }

  return { intervention, messages };
}

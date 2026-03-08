import { getIntervention } from './interventions.js';

export function buildModelMessages({ interventionId, history }) {
  const intervention = getIntervention(interventionId);
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];

  const instruction = `Return only valid JSON. The JSON must follow the requested schema exactly.

Additional response constraints:
- Keep draft_response below 95 words.
- Use one paragraph.
- Use at most one question.
- Do not give diagnosis, medication advice, hidden motive explanations, legal advice, or emergency management beyond encouraging immediate professional or crisis help when needed.
- If the user asks for medical instructions, diagnosis, or anything clearly outside scope, set model_risk high.
- Be concrete and humane.
- Do not use bullet points.`;

  const messages = [
    { role: 'system', content: intervention.systemPrompt },
    { role: 'system', content: instruction }
  ];

  for (const item of recentHistory) {
    if (!item || typeof item.content !== 'string') continue;
    if (item.role !== 'user' && item.role !== 'assistant') continue;
    messages.push({ role: item.role, content: item.content.trim() });
  }

  return { intervention, messages };
}

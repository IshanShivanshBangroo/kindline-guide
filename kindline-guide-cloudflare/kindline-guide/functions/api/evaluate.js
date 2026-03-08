import { runEvaluationSuite } from '../../lib/evaluation.js';

export async function onRequestPost(context) {
  let payload = {};
  try {
    payload = await context.request.json();
  } catch {
    payload = {};
  }

  const threshold = payload?.threshold;
  const sessionId = typeof payload?.sessionId === 'string' && payload.sessionId.trim()
    ? payload.sessionId.trim()
    : `evaluation-${crypto.randomUUID()}`;

  const results = await runEvaluationSuite({
    env: context.env,
    threshold,
    sessionId
  });

  return Response.json({ ok: true, ...results });
}

export async function onRequestGet(context) {
  return onRequestPost(context);
}

import { runSupportTurn } from '../../lib/engine.js';

function badRequest(message) {
  return Response.json({ ok: false, error: message }, { status: 400 });
}

export async function onRequestPost(context) {
  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const sessionId = typeof payload?.sessionId === 'string' && payload.sessionId.trim()
    ? payload.sessionId.trim()
    : crypto.randomUUID();
  const interventionId = typeof payload?.interventionId === 'string' ? payload.interventionId : 'stress_reset';
  const threshold = payload?.threshold;
  const history = Array.isArray(payload?.messages) ? payload.messages : [];

  if (!history.length) {
    return badRequest('messages must include at least one user message.');
  }

  const lastUser = [...history].reverse().find((item) => item?.role === 'user' && typeof item?.content === 'string');
  if (!lastUser) {
    return badRequest('messages must include a user role item with content.');
  }

  if (String(lastUser.content).length > 2500) {
    return badRequest('The latest user message is too long. Keep it under 2500 characters.');
  }

  const result = await runSupportTurn({
    env: context.env,
    sessionId,
    interventionId,
    threshold,
    history
  });

  return Response.json(result);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS'
    }
  });
}

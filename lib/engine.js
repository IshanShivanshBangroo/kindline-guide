import { buildModelMessages, buildRescueMessages } from './prompting.js';
import { assessSafety, buildFallback } from './safety.js';
import { computeUncertainty } from './uncertainty.js';
import { extractStructuredResponse, extractUsableText } from './parsing.js';
import { RESPONSE_SCHEMA } from './response-schema.js';

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeHistory(history) {
  return Array.isArray(history)
    ? history
        .filter((item) => item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant'))
        .map((item) => ({ role: item.role, content: item.content.trim() }))
    : [];
}

function computeCombinedRisk({ uncertainty, selfRisk, ruleRisk }) {
  const u = uncertainty?.available ? uncertainty.score : 0.25;
  const s = clamp(asNumber(selfRisk, 0.35), 0, 1);
  const r = clamp(asNumber(ruleRisk, 0), 0, 1);
  return Number((0.55 * u + 0.25 * s + 0.2 * r).toFixed(4));
}

function currentTimestamp() {
  return new Date().toISOString();
}

function getUsage(modelResponse) {
  return modelResponse?.usage || modelResponse?.response?.usage || null;
}

function getRawModelPreview(modelResponse) {
  const message = modelResponse?.choices?.[0]?.message;
  const content = message?.content;
  const preview = {
    responseType: typeof modelResponse?.response,
    hasChoices: Array.isArray(modelResponse?.choices),
    finishReason: modelResponse?.choices?.[0]?.finish_reason || null,
    hasToolCalls: Array.isArray(message?.tool_calls) && message.tool_calls.length > 0,
    hasFunctionCall: Boolean(message?.function_call),
    contentPreview:
      typeof content === 'string'
        ? content.slice(0, 300)
        : Array.isArray(content)
          ? content.map((part) => (typeof part === 'string' ? part : part?.text || part?.content || '')).join('').slice(0, 300)
          : typeof modelResponse?.response === 'string'
            ? modelResponse.response.slice(0, 300)
            : typeof modelResponse?.response === 'object'
              ? JSON.stringify(modelResponse.response).slice(0, 300)
              : null
  };
  return preview;
}

async function tryStructuredGeneration({ env, model, messages, intervention, safeThreshold, startedAt, sessionId, evalCaseId, userText, precheck }) {
  let modelResponse;
  try {
    modelResponse = await env.AI.run(model, {
      messages,
      response_format: RESPONSE_SCHEMA,
      max_tokens: 220,
      temperature: 0.2,
      top_p: 0.9
    });
  } catch (error) {
    return {
      ok: false,
      error,
      modelResponse: null,
      parsed: null
    };
  }

  const parsed = extractStructuredResponse(modelResponse);
  return {
    ok: Boolean(parsed && typeof parsed.draft_response === 'string' && parsed.draft_response.trim()),
    modelResponse,
    parsed,
    error: null
  };
}

async function tryRescueGeneration({ env, model, interventionId, history }) {
  const { intervention, messages } = buildRescueMessages({ interventionId, history });
  try {
    const modelResponse = await env.AI.run(model, {
      messages,
      max_tokens: 180,
      temperature: 0.35,
      top_p: 0.9
    });
    const text = extractUsableText(modelResponse);
    if (!text) return { ok: false, intervention, modelResponse, parsed: null };
    return {
      ok: true,
      intervention,
      modelResponse,
      parsed: {
        draft_response: text,
        model_risk: 0.3,
        scope_note: 'Recovered from unstructured model output after the structured pass failed.',
        micro_skill: null,
        support_move: 'reflect'
      }
    };
  } catch (error) {
    return { ok: false, intervention, modelResponse: null, parsed: null, error };
  }
}

export async function runSupportTurn({ env, sessionId, interventionId, threshold, history, evalCaseId = null }) {
  const startedAt = Date.now();
  const normalizedHistory = normalizeHistory(history);
  const latestUserMessage = [...normalizedHistory].reverse().find((item) => item.role === 'user');
  const userText = latestUserMessage?.content || '';
  const safeThreshold = clamp(asNumber(threshold, 0.62), 0.2, 0.95);

  const precheck = assessSafety(userText);
  if (precheck.flags.crisis || precheck.flags.violence) {
    const finalText = buildFallback({ reason: 'crisis_precheck' });
    return {
      ok: true,
      model: env.MODEL_NAME || DEFAULT_MODEL,
      reply: finalText,
      draft: null,
      gate: {
        triggered: true,
        reason: 'crisis_precheck',
        combinedRisk: 1,
        uncertainty: { available: false, score: null, meanEntropy: null, meanSurprisal: null, tokenCount: 0 },
        selfRisk: 1,
        ruleRisk: 1,
        threshold: safeThreshold
      },
      intervention: null,
      scopeNote: 'Crisis content was handled before model generation.',
      usage: null,
      logEntry: {
        sessionId,
        evalCaseId,
        timestamp: currentTimestamp(),
        userText,
        assistantDraft: null,
        assistantFinal: finalText,
        gateTriggered: true,
        gateReason: 'crisis_precheck',
        combinedRisk: 1,
        uncertaintyScore: null,
        selfRisk: 1,
        ruleRisk: 1,
        threshold: safeThreshold,
        latencyMs: Date.now() - startedAt,
        usage: null
      }
    };
  }

  if (precheck.flags.medical) {
    const finalText = buildFallback({ reason: 'medical_boundary' });
    return {
      ok: true,
      model: env.MODEL_NAME || DEFAULT_MODEL,
      reply: finalText,
      draft: null,
      gate: {
        triggered: true,
        reason: 'medical_boundary',
        combinedRisk: 0.95,
        uncertainty: { available: false, score: null, meanEntropy: null, meanSurprisal: null, tokenCount: 0 },
        selfRisk: 1,
        ruleRisk: 0.85,
        threshold: safeThreshold
      },
      intervention: null,
      scopeNote: 'Medical content was handled before model generation.',
      usage: null,
      logEntry: {
        sessionId,
        evalCaseId,
        timestamp: currentTimestamp(),
        userText,
        assistantDraft: null,
        assistantFinal: finalText,
        gateTriggered: true,
        gateReason: 'medical_boundary',
        combinedRisk: 0.95,
        uncertaintyScore: null,
        selfRisk: 1,
        ruleRisk: 0.85,
        threshold: safeThreshold,
        latencyMs: Date.now() - startedAt,
        usage: null
      }
    };
  }

  const { intervention, messages } = buildModelMessages({ interventionId, history: normalizedHistory });
  const model = env.MODEL_NAME || DEFAULT_MODEL;

  let generation = await tryStructuredGeneration({
    env,
    model,
    messages,
    intervention,
    safeThreshold,
    startedAt,
    sessionId,
    evalCaseId,
    userText,
    precheck
  });

  let structuredRecovered = false;
  if (!generation.ok) {
    const rescued = await tryRescueGeneration({ env, model, interventionId, history: normalizedHistory });
    if (rescued.ok) {
      generation = {
        ok: true,
        modelResponse: rescued.modelResponse,
        parsed: rescued.parsed,
        error: generation.error || rescued.error
      };
      structuredRecovered = true;
    }
  }

  if (!generation.ok || !generation.parsed || typeof generation.parsed.draft_response !== 'string') {
    const finalText = buildFallback({ reason: 'invalid_model_output', interventionLabel: intervention.label });
    return {
      ok: true,
      model,
      reply: finalText,
      draft: null,
      gate: {
        triggered: true,
        reason: 'invalid_model_output',
        combinedRisk: 0.82,
        uncertainty: computeUncertainty(generation.modelResponse),
        selfRisk: 1,
        ruleRisk: precheck.ruleRisk,
        threshold: safeThreshold
      },
      intervention,
      scopeNote: 'Model output could not be parsed as the required structured object.',
      usage: getUsage(generation.modelResponse),
      logEntry: {
        sessionId,
        evalCaseId,
        timestamp: currentTimestamp(),
        userText,
        assistantDraft: null,
        assistantFinal: finalText,
        gateTriggered: true,
        gateReason: 'invalid_model_output',
        combinedRisk: 0.82,
        uncertaintyScore: computeUncertainty(generation.modelResponse).score,
        selfRisk: 1,
        ruleRisk: precheck.ruleRisk,
        threshold: safeThreshold,
        latencyMs: Date.now() - startedAt,
        usage: getUsage(generation.modelResponse),
        rawModelPreview: getRawModelPreview(generation.modelResponse),
        errorMessage: String(generation.error?.message || generation.error || '')
      }
    };
  }

  const parsed = generation.parsed;
  const uncertainty = computeUncertainty(generation.modelResponse);
  const postcheck = assessSafety(parsed.draft_response);
  const selfRisk = clamp(asNumber(parsed.model_risk, structuredRecovered ? 0.3 : 0.35), 0, 1);
  const ruleRisk = Math.max(precheck.ruleRisk, postcheck.ruleRisk);
  const combinedRisk = computeCombinedRisk({ uncertainty, selfRisk, ruleRisk });

  let gateReason = null;
  let finalText = String(parsed.draft_response || '').trim();
  if (postcheck.flags.crisis || postcheck.flags.violence) {
    gateReason = 'crisis_postcheck';
    finalText = buildFallback({ reason: 'crisis_postcheck' });
  } else if (postcheck.flags.medical) {
    gateReason = 'medical_boundary';
    finalText = buildFallback({ reason: 'medical_boundary' });
  } else if (combinedRisk >= safeThreshold) {
    gateReason = 'uncertainty_gate';
    finalText = buildFallback({ reason: 'uncertainty_gate', interventionLabel: intervention.label });
  }

  const gateTriggered = Boolean(gateReason);
  const usage = getUsage(generation.modelResponse);
  const responsePayload = {
    ok: true,
    model,
    reply: finalText,
    draft: String(parsed.draft_response || '').trim(),
    intervention: {
      id: intervention.id,
      label: intervention.label,
      theoryBasis: intervention.theoryBasis
    },
    microSkill: parsed.micro_skill,
    supportMove: parsed.support_move,
    scopeNote: parsed.scope_note,
    gate: {
      triggered: gateTriggered,
      reason: gateReason,
      combinedRisk,
      uncertainty,
      selfRisk,
      ruleRisk,
      threshold: safeThreshold
    },
    usage,
    logEntry: {
      sessionId,
      evalCaseId,
      timestamp: currentTimestamp(),
      userText,
      assistantDraft: String(parsed.draft_response || '').trim(),
      assistantFinal: finalText,
      interventionId: intervention.id,
      interventionLabel: intervention.label,
      microSkill: parsed.micro_skill,
      supportMove: parsed.support_move,
      scopeNote: parsed.scope_note,
      gateTriggered,
      gateReason,
      combinedRisk,
      uncertaintyScore: uncertainty.score,
      meanEntropy: uncertainty.meanEntropy,
      meanSurprisal: uncertainty.meanSurprisal,
      selfRisk,
      ruleRisk,
      threshold: safeThreshold,
      latencyMs: Date.now() - startedAt,
      usage,
      structuredRecovered,
      rawModelPreview: structuredRecovered ? getRawModelPreview(generation.modelResponse) : undefined
    }
  };

  return responsePayload;
}

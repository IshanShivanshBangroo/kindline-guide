const KINDLINE_RESPONSE_OBJECT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    draft_response: {
      type: 'string',
      description: 'The bounded supportive response that would be shown to the user if it passes safety gating.'
    },
    micro_skill: {
      type: 'string',
      description: 'The specific micro-skill used for this intervention turn.'
    },
    support_move: {
      type: 'string',
      enum: ['reflect', 'clarify', 'reframe', 'action']
    },
    model_risk: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'A conservative self-rating of response risk. 0 means low risk. 1 means do not deliver without fallback.'
    },
    scope_note: {
      type: 'string',
      description: 'A short, non-private note about why the response remains inside scope.'
    }
  },
  required: ['draft_response', 'micro_skill', 'support_move', 'model_risk', 'scope_note']
};

// For Cloudflare AI.run, use JSON object mode and validate the structure ourselves.
// This avoids relying on per-model JSON Schema enforcement behavior.
export const RESPONSE_SCHEMA = {
  type: 'json_object'
};

export const RESPONSE_CONTRACT = KINDLINE_RESPONSE_OBJECT;

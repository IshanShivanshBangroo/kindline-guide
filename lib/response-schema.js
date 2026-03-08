export const RESPONSE_OBJECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    draft_response: {
      type: 'string',
      description: 'The bounded supportive response shown to the user if it passes safety gating.'
    },
    model_risk: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'A conservative self-rating of response risk. 0 means low risk, 1 means do not deliver without fallback.'
    },
    scope_note: {
      type: 'string',
      description: 'A short note about why the response stays in scope.'
    },
    micro_skill: {
      type: 'string',
      description: 'Optional short name for the micro-skill used.'
    },
    support_move: {
      type: 'string',
      enum: ['reflect', 'clarify', 'reframe', 'action'],
      description: 'Optional high-level support move used in the response.'
    }
  },
  required: ['draft_response', 'model_risk', 'scope_note']
};

export const RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: RESPONSE_OBJECT_SCHEMA
};

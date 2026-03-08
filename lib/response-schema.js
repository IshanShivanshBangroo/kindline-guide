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
      enum: [
        'reflect_feeling',
        'clarify_context',
        'grounding_check',
        'one_step_action',
        'normalize_without_minimizing',
        'self_kindness_prompt',
        'non_global_reframe',
        'contextualize_event',
        'challenge_global_label',
        'values_consistent_next_step',
        'clarify_value',
        'reduce_task_size',
        'name_next_action'
      ]
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

export const RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'kindline_response',
    description: 'Structured bounded support response for the KindLine Guide public demo.',
    strict: true,
    schema: KINDLINE_RESPONSE_OBJECT
  }
};

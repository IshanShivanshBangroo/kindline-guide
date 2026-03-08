import { listInterventions } from '../../lib/interventions.js';

export async function onRequestGet(context) {
  const model = context.env.MODEL_NAME || '@cf/zai-org/glm-4.7-flash';
  return Response.json({
    app: {
      name: context.env.APP_NAME || 'KindLine Guide',
      subtitle:
        'A bounded, uncertainty-aware support tool for reflective coping practice. It is not a crisis, medical, or diagnostic service.'
    },
    defaults: {
      model,
      threshold: Number(context.env.DEFAULT_THRESHOLD || 0.62),
      voiceOutput: true,
      speechInputSupported: true
    },
    interventions: listInterventions()
  });
}

export async function onRequestGet(context) {
  return Response.json({
    ok: true,
    app: context.env.APP_NAME || 'KindLine Guide',
    model: context.env.MODEL_NAME || '@cf/zai-org/glm-4.7-flash',
    timestamp: new Date().toISOString()
  });
}

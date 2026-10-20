// Keep the browser on pages.dev while D1 and native rate limiting stay in the
// private Worker. Forward the original request so origin validation still applies.
export default {
  async fetch(request, env) {
    if (!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (env.FEEDBACK_API) return await env.FEEDBACK_API.fetch(request);
    } catch {
      console.error('feedback_service_unavailable');
    }
    return Response.json({ error: 'Feedback is temporarily unavailable. Please retry later.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  }
};

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    newResponse.headers.set("Pragma", "no-cache");
    return newResponse;
  }
};

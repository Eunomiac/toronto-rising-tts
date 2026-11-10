export default {
  async fetch(request, environment) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: 'toronto-rising-player-map',
        storage: 'not-configured',
      });
    }
    return environment.ASSETS.fetch(request);
  },
};

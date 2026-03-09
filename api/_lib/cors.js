export function applyCors(req, res) {
  const origin = req.headers.origin;
  const frontendUrl = process.env.FRONTEND_URL;

  if (origin) {
    if (frontendUrl && origin === frontendUrl) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!frontendUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

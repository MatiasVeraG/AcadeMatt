export default function handler(req, res) {
  res.json({ status: 'ok', service: 'AcadeMatt API', timestamp: new Date().toISOString() });
}

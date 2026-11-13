export function GET() {
  return Response.json({ status: 'ok', service: 'epistemictrust-ai' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

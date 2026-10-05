import { it, expect } from 'vitest';
import { createServer } from 'node:http';
import { aiGenerate } from '../server/services';
it('uses a server-side AI key and preserves the provider suggestion', async () => {
  let received: any;
  let authorization = '';
  const server = createServer(async (req, res) => {
    let data = '';
    for await (const chunk of req) data += chunk;
    received = JSON.parse(data);
    authorization = req.headers.authorization || '';
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [
          { message: { content: 'Improved existing facts, with no invented achievements.' } },
        ],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const oldKey = process.env.AI_API_KEY,
    oldBase = process.env.AI_BASE_URL;
  process.env.AI_API_KEY = 'test-provider-key';
  process.env.AI_BASE_URL = `http://127.0.0.1:${address.port}`;
  try {
    const result = await aiGenerate('Rewrite professionally.', { text: 'Managed cloud systems.' });
    expect(result).toBe('Improved existing facts, with no invented achievements.');
    expect(authorization).toBe('Bearer test-provider-key');
    expect(received.messages[0].content).toContain('Never fabricate');
    expect(received.messages[1].content).toContain('Managed cloud systems.');
  } finally {
    if (oldKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = oldKey;
    if (oldBase === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = oldBase;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

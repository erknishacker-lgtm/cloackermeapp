import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../src/server/app.js';

const servers = [];

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const handle = {
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          })
      };
      servers.push(handle);
      resolve(handle);
    });
  });
}

afterEach(async () => {
  while (servers.length) {
    const server = servers.pop();
    await server.close();
  }
});

describe('server routes', () => {
  test('creates a campaign and exposes it through the campaign API', async () => {
    const app = createApp();
    const server = await listen(app);

    const createdResponse = await fetch(`${server.baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Campanha Teste',
        slug: 'campanha-teste',
        primaryUrl: 'https://example.com/real',
        fallbackUrl: 'https://example.com/safe',
        platform: 'Custom',
        domain: 'go.example.com'
      })
    });
    const created = await createdResponse.json();

    expect(createdResponse.status).toBe(201);
    expect(created.slug).toBe('campanha-teste');

    const listResponse = await fetch(`${server.baseUrl}/api/campaigns`);
    const list = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(list.some((campaign) => campaign.slug === 'campanha-teste')).toBe(true);
  });

  test('redirects a normal browser request to the primary URL', async () => {
    const app = createApp({ seedDemo: true });
    const server = await listen(app);

    const response = await fetch(`${server.baseUrl}/r/demo`, {
      redirect: 'manual',
      headers: {
        'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/126 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'pt-BR,pt;q=0.9'
      }
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/real-offer');
  });

  test('redirects obvious automation to the fallback URL and logs the decision', async () => {
    const app = createApp({ seedDemo: true });
    const server = await listen(app);

    const response = await fetch(`${server.baseUrl}/r/demo`, {
      redirect: 'manual',
      headers: {
        'user-agent': 'python-requests/2.31',
        accept: '*/*'
      }
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/safe-page');

    const eventsResponse = await fetch(`${server.baseUrl}/api/events`);
    const events = await eventsResponse.json();
    expect(eventsResponse.status).toBe(200);
    expect(events[0].decision).toBe('fallback');
    expect(events[0].reasons).toContain('known_automation_user_agent');
  });

  test('creates, toggles, renames and deletes a custom domain through the API', async () => {
    const app = createApp();
    const server = await listen(app);

    const createdResponse = await fetch(`${server.baseUrl}/api/domains`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain: 'cliente.com.br' })
    });
    const created = await createdResponse.json();

    expect(createdResponse.status).toBe(201);
    expect(created.domain).toBe('cliente.com.br');
    expect(created.active).toBe(true);

    const renamedResponse = await fetch(`${server.baseUrl}/api/domains/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain: 'novo-cliente.com.br', active: false })
    });
    const renamed = await renamedResponse.json();

    expect(renamedResponse.status).toBe(200);
    expect(renamed.domain).toBe('novo-cliente.com.br');
    expect(renamed.active).toBe(false);

    const deleteResponse = await fetch(`${server.baseUrl}/api/domains/${created.id}`, { method: 'DELETE' });
    expect(deleteResponse.status).toBe(204);

    const listResponse = await fetch(`${server.baseUrl}/api/domains`);
    const list = await listResponse.json();
    expect(list.custom.some((domain) => domain.id === created.id)).toBe(false);
  });

  test('manual IP blocks are stored and affect redirects', async () => {
    const app = createApp({ seedDemo: true });
    const server = await listen(app);

    const blockResponse = await fetch(`${server.baseUrl}/api/blocked-ips`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ip: '198.51.100.44', reason: 'manual block' })
    });
    const block = await blockResponse.json();

    expect(blockResponse.status).toBe(201);
    expect(block.ip).toBe('198.51.100.44');

    const redirectResponse = await fetch(`${server.baseUrl}/r/demo`, {
      redirect: 'manual',
      headers: {
        'x-forwarded-for': '198.51.100.44',
        'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/126 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'pt-BR,pt;q=0.9'
      }
    });

    expect(redirectResponse.status).toBe(302);
    expect(redirectResponse.headers.get('location')).toBe('https://example.com/safe-page');

    const listResponse = await fetch(`${server.baseUrl}/api/blocked-ips`);
    const list = await listResponse.json();
    expect(list.some((item) => item.ip === '198.51.100.44')).toBe(true);
  });

  test('pauses and deletes a campaign', async () => {
    const app = createApp({ seedDemo: true });
    const server = await listen(app);

    const paused = await fetch(`${server.baseUrl}/api/campaigns/cmp_demo`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'paused' })
    });
    expect(paused.status).toBe(200);
    expect((await paused.json()).status).toBe('paused');

    const redirect = await fetch(`${server.baseUrl}/r/demo`, { redirect: 'manual' });
    expect(redirect.status).toBe(404);

    const deleted = await fetch(`${server.baseUrl}/api/campaigns/cmp_demo`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);
  });

  test('settings can be updated', async () => {
    const app = createApp();
    const server = await listen(app);

    const response = await fetch(`${server.baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operatorEmail: 'ops@example.com', autoBlockEnabled: false })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.operatorEmail).toBe('ops@example.com');
    expect(payload.autoBlockEnabled).toBe(false);
  });
});

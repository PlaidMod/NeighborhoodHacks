import test from 'node:test';
import assert from 'node:assert/strict';
import { requestCoaching } from '../../lib/speak/client.ts';
import { parseCoachInput } from '../../lib/coach/validate.ts';

test('corrupt browser IDs recover before sending a coaching request', async (t) => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored = '------------------------------------';
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => stored,
    setItem: (_key, value) => { stored = value; },
  } });
  t.after(() => {
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
  });
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const input = JSON.parse(options.body);
    requests.push(input);
    return Response.json(parseCoachInput(input) ? { provider: 'local' } : { error: 'invalid_request' }, {
      status: parseCoachInput(input) ? 200 : 400,
    });
  });
  const input = { mode: 'coach', item_id: 'hisd-calendar', draft: 'Please keep bus service.', lang: 'en' };
  assert.deepEqual(await requestCoaching(input), { provider: 'local' });
  assert.notEqual(stored, '------------------------------------');
  await requestCoaching(input);
  assert.equal(requests[0].browser_id, stored);
  assert.equal(requests[1].browser_id, stored);
});

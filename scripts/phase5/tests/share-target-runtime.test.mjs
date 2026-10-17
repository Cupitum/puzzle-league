import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup() {
  const events = new Map();
  const stored = [];
  const notifications = [];
  const db = {
    transaction() {
      const txn = { oncomplete: null, onerror: null };
      txn.objectStore = () => ({
        put(value) {
          stored.push(value);
          queueMicrotask(() => txn.oncomplete?.());
        },
      });
      return txn;
    },
    close() {},
  };
  const indexedDB = { open() {
    const req = { result: db, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess?.());
    return req;
  }};
  const self = {
    location: { origin: 'http://localhost:5173' },
    addEventListener(type, handler) { events.set(type, handler); },
    clients: { async matchAll() { return [{ postMessage(m) { notifications.push(m); } }]; } },
  };
  const context = vm.createContext({ self, indexedDB, caches: {}, Promise, URL, Response, crypto: { randomUUID: () => 'once-1' }, Date, queueMicrotask });
  vm.runInContext(fs.readFileSync('public/sw.js', 'utf8'), context);
  async function incoming(fields, method = 'POST', path = '/share-target') {
    let responsePromise;
    const request = {
      url: `http://localhost:5173${path}`,
      method,
      async formData() { return new Map(Object.entries(fields)); },
    };
    events.get('fetch')({ request, respondWith(p) { responsePromise = p; } });
    return responsePromise ? await responsePromise : null;
  }
  return { incoming, stored, notifications };
}

test('Android POST retains exact multiline emoji share in IndexedDB, not in URL or message', async () => {
  const { incoming, stored, notifications } = setup();
  const text = 'Wordle 1936 4/6\n⬛🟨🟩⬛🟩\n🟩🟩🟩🟩🟩';
  const res = await incoming({ text, title: 'Wordle', url: 'https://www.nytimes.com/games/wordle/' });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'http://localhost:5173/?incoming=1');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].text, text);
  assert.equal(notifications.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(notifications[0])), { type: 'puzzle-league-share-received' });
  assert.equal(JSON.stringify(notifications).includes('Wordle 1936'), false);
});

test('Android URL-only share routes to reviewable draft without inventing game result', async () => {
  const { incoming, stored } = setup();
  const res = await incoming({ title: 'Wordle', url: 'https://www.nytimes.com/games/wordle/' });
  assert.equal(res.status, 303);
  assert.equal(stored[0].text, 'Wordle\nhttps://www.nytimes.com/games/wordle/');
});

test('Blank share informs user without creating a stored submission', async () => {
  const { incoming, stored, notifications } = setup();
  const res = await incoming({ title: '', text: '', url: '' });
  assert.equal(res.headers.get('location'), 'http://localhost:5173/?incoming=empty');
  assert.equal(stored.length, 0);
  assert.equal(notifications.length, 0);
});

test('No non-share request is intercepted by share handler', async () => {
  const { incoming } = setup();
  assert.equal(await incoming({}, 'POST', '/functions/v1/competition'), null);
});

test('UI refreshes on service-worker messages and focus; clicking submit explains auth requirements', () => {
  const ui = fs.readFileSync('src/ui/App.tsx', 'utf8');
  assert.match(ui, /navigator\.serviceWorker\?\.addEventListener\('message', onIncoming\)/);
  assert.match(ui, /window\.addEventListener\('focus', onFocus\)/);
  assert.match(ui, /document\.addEventListener\('visibilitychange', onVisible\)/);
  assert.match(ui, /if \(!session\) \{ setPage\('account'\); return flash\('Sign in first/);
  assert.match(ui, /<Button type="submit" disabled=\{busy\}>Confirm and submit to server<\/Button>/);
  assert.match(ui, /if \(!understands\) return flash\('Check the ownership/);
});

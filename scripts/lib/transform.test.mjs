import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteLinks, transform } from './transform.mjs';

const map = [
  { source: 'docs/deployment.md', dest: 'guides/deployment.md', route: '/guides/deployment/' },
  { source: 'docs/security.md', dest: 'reference/security.md', route: '/reference/security/' },
  { source: 'docs/api.md', dest: null, route: '/reference/http-api/' },
];
const entry = map[0];

test('rewrites a sibling .md link to its route', () => {
  const out = rewriteLinks('See [deployment](deployment.md).', entry, map);
  assert.equal(out, 'See [deployment](/guides/deployment/).');
});

test('keeps the anchor', () => {
  const out = rewriteLinks('See [the API](api.md#starting-the-server).', entry, map);
  assert.equal(out, 'See [the API](/reference/http-api/#starting-the-server).');
});

test('rewrites a docs/-prefixed link, as written in the README', () => {
  const out = rewriteLinks('See [security](docs/security.md).', entry, map);
  assert.equal(out, 'See [security](/reference/security/).');
});

test('leaves external links alone', () => {
  const body = 'See [Proxmox](https://pve.proxmox.com/wiki/Main_Page).';
  assert.equal(rewriteLinks(body, entry, map), body);
});

test('throws on a target missing from the manifest', () => {
  assert.throws(
    () => rewriteLinks('See [gone](nowhere.md).', entry, map),
    /nowhere\.md/,
  );
});

test('transform strips the h1 and writes the frontmatter', () => {
  const out = transform({
    source: 'docs/deployment.md',
    body: '# Where to run RestoreLab\n\nBody text.\n',
    entry: { ...entry, title: 'Deployment', description: 'Where to run it.', order: 5 },
    map,
  });
  assert.match(out, /^---\ntitle: Deployment\n/);
  assert.match(out, /description: Where to run it\./);
  assert.match(out, /order: 5/);
  assert.match(out, /<!-- Generated from docs\/deployment\.md/);
  assert.doesNotMatch(out, /# Where to run RestoreLab/);
  assert.match(out, /Body text\./);
});

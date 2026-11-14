// Runs the real app against the real Overpass servers and records what it read.
const { chromium } = require('playwright');
const fs = require('fs');
const SITES = [
  ['Sacramento downtown', 38.5816, -121.4944],
  ['Elk Grove residential', 38.4088, -121.3716],
  ['Folsom Blvd', 38.6781, -121.1761],
  ['Roseville intersection', 38.7521, -121.2880]
];
(async () => {
  const b = await chromium.launch();
  const out = [];
  fs.mkdirSync('road-test-results', { recursive: true });
  for (const [name, lat, lon] of SITES) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const reqs = []; p.on('requestfailed', r => { if (/overpass|arcgis/.test(r.url())) reqs.push('FAILED ' + r.failure().errorText + ' ' + r.url().slice(0, 60)); }); p.on('response', r => { if (/overpass|arcgis/.test(r.url())) reqs.push(r.status() + ' ' + r.url().slice(0, 80)); });
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(800);
    await p.fill('#pts', lat.toFixed(6) + ', ' + lon.toFixed(6) + ' ' + name);
    await p.waitForTimeout(1500);
    for (let i = 0; i < 3; i++) { try { await p.click('#nextbtn', { timeout: 3000 }); } catch (e) {} await p.waitForTimeout(400); }
    let loaded = false;
    for (let t = 0; t < 45 && !loaded; t++) { await p.waitForTimeout(1000); loaded = await p.evaluate(() => /Roads matched|roads loaded|Map data loaded/i.test(document.body.innerText)); }
    await p.click('#tab-plan').catch(() => {}); await p.waitForTimeout(1500);
    const streets = await p.evaluate(() => { const d = document.getElementById('streetsd'); if (d) d.open = true; return d ? d.innerText : 'no streets panel'; });
    const hint = await p.evaluate(() => (document.getElementById('mhint') || {}).innerText || '');
    await p.screenshot({ path: 'road-test-results/' + name.replace(/\W+/g, '_') + '.png', fullPage: true }).catch(() => {});
    out.push({ name, lat, lon, loaded, hint, requests: reqs.slice(0, 8), errors: errs, streets });
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync('road-test-results/results.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();

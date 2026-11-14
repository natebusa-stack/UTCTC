// Real-network road reading across Northern California. Records what the app read and whether the result is sane.
const { chromium } = require('playwright');
const fs = require('fs');
const SITES = [
  ['SF Market and Van Ness', 37.7752, -122.4194], ['SF Mission and 16th', 37.7650, -122.4196], ['SF Irving and 9th Ave', 37.7640, -122.4660],
  ['SF Lombard crooked block', 37.8021, -122.4187], ['SF Embarcadero and Broadway', 37.7983, -122.3973], ['SF Geary and Divisadero', 37.7821, -122.4388],
  ['SF Sunset 19th Ave', 37.7430, -122.4758], ['Oakland Broadway and 14th', 37.8044, -122.2712], ['San Jose 1st and Santa Clara', 37.3352, -121.8905],
  ['Santa Rosa Mendocino Ave', 38.4440, -122.7140], ['Redding Churn Creek Rd', 40.5865, -122.3917], ['Eureka 5th and H', 40.8021, -124.1637],
  ['South Lake Tahoe US-50', 38.9487, -119.9358], ['Napa Hwy 29 rural', 38.4980, -122.3150], ['Truckee Donner Pass Rd', 39.3270, -120.1830],
  ['Chico Mangrove', 39.7285, -121.8375], ['Marin Sir Francis Drake', 37.9735, -122.5311], ['Stockton Pacific Ave', 37.9577, -121.2908],
  ['Yuba rural Hwy 99', 39.1400, -121.6200], ['Elk Grove residential', 38.4088, -121.3716], ['Sacramento 9th and I', 38.5816, -121.4944], ['Folsom Sutter St', 38.6781, -121.1761]
];
const only = process.argv[2];
async function one(b, [name, lat, lon]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const t0 = Date.now(); const R = { name, lat, lon };
  try {
    await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(600);
    await p.fill('#pts', lat.toFixed(6) + ', ' + lon.toFixed(6) + ' ' + name); await p.waitForTimeout(1200);
    for (let i = 0; i < 3; i++) { try { await p.click('#nextbtn', { timeout: 2500 }); } catch (e) {} await p.waitForTimeout(300); }
    for (let t = 0; t < 80; t++) { await p.waitForTimeout(1000); const s = await p.evaluate(() => (document.getElementById('mstat') || {}).innerText || ''); R.mstat = s; if (/Map data loaded|Roads did not load/.test(s)) break; }
    R.secs = Math.round((Date.now() - t0) / 1000);
    await p.waitForTimeout(2500);
    await p.click('#tab-plan').catch(() => {}); await p.waitForTimeout(1500);
    const d = await p.evaluate(() => { const o = {}; const s = document.getElementById('streetsd'); o.streets = s ? s.innerText.split('\n').slice(0, 40).join('\n') : ''; const t = document.body.innerText; o.head = (t.match(/Site 1[^\n]*/) || [''])[0]; o.chk = (t.match(/MUTCD check[^\n]*/) || [''])[0]; o.totals = (t.match(/\d+ signs?[^\n]*flagger[^\n]*/i) || [''])[0]; o.matched = /Matched 1 of 1/.test(t); return o; });
    Object.assign(R, d);
    await p.evaluate(() => document.querySelectorAll('details').forEach(x => { if (/Aerial view/i.test(x.innerText.slice(0, 40))) x.open = true; }));
    const im = await p.$('details:has(summary:has-text("Aerial view")) img'); if (im) { await im.scrollIntoViewIfNeeded(); await im.screenshot({ path: 'road-test-results/nc_' + name.replace(/\W+/g, '_') + '.png' }); }
  } catch (e) { R.fail = String(e.message).slice(0, 200); }
  R.errors = errs; await ctx.close(); return R;
}
(async () => {
  const b = await chromium.launch(); fs.mkdirSync('road-test-results', { recursive: true });
  const list = only ? SITES.filter(s => s[0].indexOf(only) >= 0) : SITES, out = [];
  for (let i = 0; i < list.length; i += 4) { const r = await Promise.all(list.slice(i, i + 4).map(s => one(b, s))); r.forEach(x => { out.push(x); console.log(x.name, '|', x.secs + 's', '|', (x.mstat || '').slice(0, 70), '|', x.head, '|', x.chk); }); }
  fs.writeFileSync('road-test-results/norcal.json', JSON.stringify(out, null, 2)); await b.close();
})();

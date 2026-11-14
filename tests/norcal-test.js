// Real roads, real network, many NorCal places. Records what the app read and flags anything suspicious.
const { chromium } = require('playwright');
const fs = require('fs');
const SITES = [
  ['SF Market & Van Ness', 37.7752, -122.4194], ['SF Mission & 16th', 37.7650, -122.4197], ['SF Geary & Divisadero', 37.7822, -122.4375],
  ['SF 19th Ave & Taraval', 37.7430, -122.4755], ['SF Embarcadero & Broadway', 37.7981, -122.3979], ['SF 24th & Church', 37.7517, -122.4275],
  ['SF Lombard Crooked St', 37.8021, -122.4187], ['SF Bayshore Blvd', 37.7290, -122.4000],
  ['Oakland Broadway & 14th', 37.8044, -122.2712], ['Berkeley Shattuck', 37.8719, -122.2678], ['San Jose Santa Clara St', 37.3352, -121.8881],
  ['Sacramento 21st & K', 38.5754, -121.4731], ['Sacramento Elk Grove', 38.4088, -121.3716], ['Davis 3rd & B', 38.5449, -121.7405],
  ['Santa Rosa 4th St', 38.4404, -122.7141], ['Napa Main St', 38.2975, -122.2869], ['Redding Market St', 40.5865, -122.3917],
  ['Chico Main St', 39.7285, -121.8375], ['Eureka 5th St', 40.8021, -124.1637], ['Truckee Donner Pass Rd', 39.3280, -120.1833],
  ['Grass Valley Hwy 49', 39.2191, -121.0614], ['Yuba City Hwy 99', 39.1400, -121.6200], ['Mendocino Hwy 1', 39.3077, -123.7995],
  ['Folsom Sutter St', 38.6781, -121.1761], ['Roseville Main St', 38.7521, -121.2880], ['Lake Tahoe Hwy 50', 38.9399, -119.9772]
];
const POOL = 4;
async function one(b, [name, lat, lon]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const t0 = Date.now();
  await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(600);
  await p.fill('#pts', lat.toFixed(6) + ', ' + lon.toFixed(6) + ' ' + name); await p.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { try { await p.click('#nextbtn', { timeout: 2500 }); } catch (e) {} await p.waitForTimeout(300); }
  let mstat = '', loaded = false;
  for (let t = 0; t < 90 && !loaded; t++) { await p.waitForTimeout(1000); mstat = await p.evaluate(() => (document.getElementById('mstat') || {}).innerText || ''); loaded = /Map data loaded/i.test(mstat); if (/Roads did not load/.test(mstat)) break; }
  await p.waitForTimeout(1500);
  const dbg = await p.evaluate(() => { try { return window.UTCTC_DEBUG(); } catch (e) { return 'ERR ' + e.message; } });
  await p.click('#tab-plan').catch(() => {}); await p.waitForTimeout(1200);
  try { await p.evaluate(() => document.querySelectorAll('details').forEach(d => { if (/Aerial view/i.test(d.innerText.slice(0, 40))) d.open = true; })); const im = await p.$('details:has(summary:has-text("Aerial view")) img'); if (im) { await im.scrollIntoViewIfNeeded(); await im.screenshot({ path: 'road-test-results/nc_' + name.replace(/\W+/g, '_') + '.png' }); } } catch (e) {}
  const streets = await p.evaluate(() => { const d = document.getElementById('streetsd'); return d ? d.innerText.slice(0, 900) : ''; });
  const flags = [];
  const d0 = Array.isArray(dbg) ? dbg[0] : null;
  if (!loaded) flags.push('roads did not load: ' + mstat.slice(0, 140));
  if (d0) {
    if (loaded && !d0.osm) flags.push('no road matched at the pin');
    if (d0.mutcdBad && d0.mutcdBad.length) flags.push('MUTCD check: ' + d0.mutcdBad.join('; '));
    if (d0.flaggers > 8) flags.push('flaggers ' + d0.flaggers);
    if (d0.signs > 45) flags.push('signs ' + d0.signs);
    if (loaded && d0.osm && (!d0.legs || !d0.legs.length)) flags.push('no legs read');
  } else flags.push('debug ' + JSON.stringify(dbg));
  if (errs.length) flags.push('page errors: ' + errs.join('; ').slice(0, 160));
  await ctx.close();
  return { name, lat, lon, secs: Math.round((Date.now() - t0) / 1000), loaded, mstat: mstat.slice(0, 120), dbg: d0, flags, streets };
}
(async () => {
  const b = await chromium.launch(); fs.mkdirSync('road-test-results', { recursive: true });
  const res = [], q = SITES.slice();
  await Promise.all(Array.from({ length: POOL }, async () => { while (q.length) { const s = q.shift(); try { res.push(await one(b, s)); } catch (e) { res.push({ name: s[0], flags: ['test crashed: ' + e.message] }); } } }));
  await b.close();
  res.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync('road-test-results/norcal.json', JSON.stringify(res, null, 2));
  const md = res.map(r => '- ' + r.name + ' [' + (r.secs || '?') + 's] ' + (r.dbg ? r.dbg.road + ' (' + r.dbg.hw + ') ' + r.dbg.speed + 'mph ' + r.dbg.rec + ' signs ' + r.dbg.signs + ' flaggers ' + r.dbg.flaggers + ' legs ' + (r.dbg.legs || []).length : '') + (r.flags.length ? '\n    FLAGS: ' + r.flags.join(' | ') : ' OK')).join('\n');
  fs.writeFileSync('road-test-results/norcal.md', md); console.log(md);
})();

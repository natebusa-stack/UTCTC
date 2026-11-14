// What do the Overpass servers say to our queries from a real network?
const fs = require('fs');
const MIR = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.openstreetmap.fr/api/interpreter', 'https://lz4.overpass-api.de/api/interpreter'];
const c = '38.581600,-121.494400';
const Q = {
  light: '[out:json][timeout:25];(way(around:150,' + c + ')["highway"];);out tags geom;',
  v73: '[out:json][timeout:40];(way(around:150,' + c + ')["highway"];way(around:600,' + c + ')["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|living_street|trunk_link|primary_link|secondary_link|tertiary_link)$"];node(around:130,' + c + ')["highway"~"^(crossing|traffic_signals|bus_stop)$"];node(around:100,' + c + ')["railway"~"^(level_crossing|crossing)$"];nwr(around:160,' + c + ')["amenity"~"^(school|kindergarten|hospital)$"];);out tags geom;',
  v75: '[out:json][timeout:40];(way(around:150,' + c + ')["highway"];way(around:400,' + c + ')["highway"~"^(service|road|motorway_link)$"];way(around:800,' + c + ')["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|living_street|trunk_link|primary_link|secondary_link|tertiary_link)$"];node(around:130,' + c + ')["highway"~"^(crossing|traffic_signals|bus_stop)$"];node(around:100,' + c + ')["railway"~"^(level_crossing|crossing)$"];nwr(around:160,' + c + ')["amenity"~"^(school|kindergarten|hospital)$"];);out tags geom;'
};
(async () => {
  const out = [];
  for (const m of MIR) for (const [k, q] of Object.entries(Q)) {
    const t0 = Date.now(); let r;
    for (const method of ['GET', 'POST']) {
      try {
        const res = method === 'GET' ? await fetch(m + '?data=' + encodeURIComponent(q), { signal: AbortSignal.timeout(45000) }) : await fetch(m, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'content-type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(45000) });
        const txt = await res.text(); let n = -1; try { n = JSON.parse(txt).elements.length; } catch (e) {}
        r = { m, k, method, status: res.status, ms: Date.now() - t0, bytes: txt.length, elements: n, head: n < 0 ? txt.slice(0, 120).replace(/\s+/g, ' ') : '' };
      } catch (e) { r = { m, k, method, err: String(e.message || e).slice(0, 80), ms: Date.now() - t0 }; }
      out.push(r); console.log(JSON.stringify(r));
      if (r.status === 200) break;
    }
  }
  fs.mkdirSync('road-test-results', { recursive: true });
  fs.writeFileSync('road-test-results/probe.json', JSON.stringify(out, null, 2));
})();

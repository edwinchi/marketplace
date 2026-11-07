// Light load test: N requests at concurrency C per URL; reports p50/p95/max latency and errors.
const [,, base = "https://marketitnow.net", N = "100", C = "10"] = process.argv;
const paths = ["/api/health", "/", "/categories/sports-fitness-e8dfa21c-646d-4d28-b19e-eed9d004bca9", "/login"];
for (const p of paths) {
  const times = []; let errors = 0, i = 0;
  const worker = async () => { while (i < +N) { i++; const t = performance.now(); try { const r = await fetch(base + p, { headers: { "user-agent": "marketitnow-loadtest/1.0" } }); await r.arrayBuffer(); if (r.status >= 500) errors++; } catch { errors++; } times.push(performance.now() - t); } };
  const t0 = performance.now();
  await Promise.all(Array.from({ length: +C }, worker));
  const secs = (performance.now() - t0) / 1000;
  times.sort((a, b) => a - b);
  const q = (x) => Math.round(times[Math.min(times.length - 1, Math.floor(times.length * x))]);
  console.log(`${p.padEnd(32).slice(0, 32)} n=${times.length} rps=${(times.length / secs).toFixed(1)} p50=${q(0.5)}ms p95=${q(0.95)}ms max=${q(0.999)}ms 5xx/err=${errors}`);
}

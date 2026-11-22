// The console's fixed file list: each URL path and the file under public/ it comes from.
export const staticFiles = new Map([
  // The console (card U1): a fixed list, so no other path under /console/ is served.
  ['/console', ['console/index.html', 'text/html']],
  ['/console/', ['console/index.html', 'text/html']],
  ...['console.css', 'office.css'].map(name => [`/console/${name}`, [`console/${name}`, 'text/css']]),
  // Card U4: the brand tokens have one source, docs/brand/tokens.css (card U2).
  ['/console/tokens.css', ['../docs/brand/tokens.css', 'text/css']],
  // Card U4b: the header logo and favicon, the CTM mark from ctm-ai.uz.
  ['/console/logo.svg', ['../docs/brand/ctm-logo.svg', 'image/svg+xml']],
  ...['console.mjs', 'office.mjs', 'office-furniture.mjs', 'sprites.mjs', 'agent-marks.mjs', 'ctm-band.mjs', 'panels.mjs', 'model.mjs', 'source.mjs', 'brain.mjs', 'evidence.mjs']
    .map(name => [`/console/${name}`, [`console/${name}`, 'text/javascript']]),
  ['/console/demo-recording.json', ['console/demo-recording.json', 'application/json']],
  // Card U6: the console's three OFL fonts, local so no request leaves the loopback host.
  ...['jersey-15', 'inter-tight', 'silkscreen'].map(name => [`/console/fonts/${name}.woff2`, [`../docs/brand/fonts/${name}.woff2`, 'font/woff2']]),
]);

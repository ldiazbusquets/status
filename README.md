# LDB Status

Public status page for Luis Diaz Busquets's websites and apps: **https://ldiazbusquets.github.io/status/**

- `sites.json` lists the sites and data feeds. Add or remove one there.
- `.github/workflows/check.yml` runs `scripts/check.mjs` every 10 minutes (HTTP status, response time, last deploy from
  `Last-Modified`, data-feed age) and commits `data/status.json` and `data/history.json` (90 days, one bucket per day).
  Each run loops ~5.6 h and then starts the next one. To stop the checks, disable the workflow.
- The page also checks every site live from the visitor's browser, so it is current between runs.

No dependencies, no build step.

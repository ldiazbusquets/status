# LDB Status (ldiazbusquets.github.io/status)
- Plain static page (index.html) + Node 20 script, no dependencies. Public: never list private/anonymous projects (ENTITY)
  or personal tools (budget, dashboard, admin) unless Luis asks.
- Data comes only from real checks (data/*.json written by the workflow, plus live browser fetches); never seed sample data.
- GitHub Pages sends `Access-Control-Allow-Origin: *`, so the browser can read sibling sites and their Last-Modified.
- The check workflow re-dispatches itself (GitHub delays cron by hours). Commits use `[skip ci]`.

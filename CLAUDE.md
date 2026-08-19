# RaisedCurious (raisedcurious.com)

Flagship family science site: experiments, weekend checklists, games, outdoor
guides, printables. Plain HTML/CSS/JS, no framework, no build step. Push to
main -> Cloudflare Pages auto-deploys (project: raised-curious). This is the
brand's front door: prefer small, reviewed changes over sweeping refactors.

## Non-negotiable values
- Everything is genuinely free: no ads, no paywalls, no logins, no trackers.
- Voice: confident, warm, direct. A smart parent who reads a lot. Never
  corporate, salesy, or preachy. Audience: parents of kids 4-16.
- Safety notes on experiments are load-bearing content, never trim them.

## Brand system ("The Field Guide")
- Colors: Forest #2D5A3D, Rust #C4522A, Gold #C9922A, Ink #1C1A16, Cream #FAF7F0.
- Type: Georgia for headings (Playfair Display is retired; replace on sight),
  Lato body, Courier Prime for mono/labels. Logo: seedling SVG mark.
- Shared css/site.css and js/site.js (nav, scroll reveal, newsletter form).
  New pages always include the shared nav + footer pattern.

## The nightly pipeline (CRITICAL: this repo has a robot coworker)
- .github/workflows/nightly.yml runs a cron that calls scripts/generate.js
  (Claude API) and COMMITS STRAIGHT TO MAIN, then Pages deploys.
- Therefore: ALWAYS git pull before starting work, and pull again before push.
- Never edit workflow files or reference secrets (ANTHROPIC_API_KEY etc.) in
  code or logs. If the pipeline references a stale deploy hook (Netlify-era),
  flag it to Matt; do not silently rewrite automation.
- Data the pipeline appends to lives in data/*.json. Manual edits must match
  the pipeline's exact schemas or the site JS breaks:
  - Experiment: {id, name, tier, cat, materials, steps[], why, safety, next}
  - Weekend list: {id, season, title, intro, items:[{t, s}], tags[]}
- js/experiments-data.js holds ~250 experiments; never restructure or
  regenerate it wholesale, only append/patch entries.

## Ecosystem (separate repos, do not edit from here)
play.raisedcurious.com (arcade), wiggle-world2.raisedcurious.com (camera game),
mystery/parlour (Cloudflare Workers, deploy via wrangler), campfire.
Cross-link with plain <a> tags; each repo has its own CLAUDE.md.

## Required checks before any push
- node --check any touched JS; validate any touched JSON with JSON.parse.
- Load changed pages via python3 -m http.server and click through once.
- Confirm shared nav/footer render and brand tokens are used (no ad-hoc hex).
- Keep diffs small; for anything touching pipeline, schemas, or site-wide CSS,
  stop and propose the plan to Matt before pushing.

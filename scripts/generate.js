#!/usr/bin/env node
/**
 * RaisedCurious.com — Nightly Content Generator
 * Runs at 1am ET via GitHub Actions
 * Calls Claude API → generates content → commits to repo → Netlify deploys
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Determine what to generate based on day of week ──────────────────────────
const DAY = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const TODAY = new Date().toISOString().split('T')[0];
const SEASON = getSeason();

function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'fall';
  return 'winter';
}

// ── Daily log ─────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync('generation-log.txt', line + '\n');
}

// ── Core Claude call ──────────────────────────────────────────────────────────
async function generate(systemPrompt, userPrompt) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });
  return msg.content[0].text;
}

// ── MONDAY: New experiment ────────────────────────────────────────────────────
async function generateExperiment() {
  log('Generating new experiment...');
  const raw = await generate(
    `You generate science experiment content for raisedcurious.com, a family science website. Output ONLY valid JSON matching the schema exactly. No markdown, no commentary.`,
    `Generate a new, creative science experiment that is NOT one of the classic 250 already on the site. Pick a tier randomly (Beginner, Explorer, or Scientist).

Return ONLY this JSON:
{
  "id": "auto-${TODAY}",
  "name": "Experiment name",
  "tier": "Beginner|Explorer|Scientist",
  "cat": "Chemistry|Physics|Biology|Earth Science|Engineering|Math & Patterns",
  "materials": "comma-separated materials list",
  "steps": ["step 1", "step 2", "step 3", "step 4"],
  "why": "2-3 sentence clear scientific explanation",
  "safety": "safety note or empty string",
  "next": "Try This Next extension idea"
}`
  );
  try {
    const exp = JSON.parse(raw.trim());
    const outPath = path.join('data', 'new-experiments.json');
    let existing = [];
    if (fs.existsSync(outPath)) existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    existing.push({ ...exp, dateAdded: TODAY });
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    log(`✓ Experiment saved: ${exp.name}`);
    return exp;
  } catch(e) {
    log(`✗ Experiment parse failed: ${e.message}`);
    return null;
  }
}

// ── TUESDAY: Weekend checklist ────────────────────────────────────────────────
async function generateWeekendList() {
  log('Generating weekend checklist...');
  const raw = await generate(
    `You generate weekend activity content for raisedcurious.com. Output ONLY valid JSON. No markdown, no commentary.`,
    `Generate a new weekend activity checklist for ${SEASON}. Make it specific, practical, and genuinely interesting. Not generic.

Return ONLY this JSON:
{
  "title": "Catchy list title",
  "season": "${SEASON}",
  "intro": "2-3 sentences setting up the list",
  "items": [
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"},
    {"t": "Activity title", "s": "Specific how-to tip"}
  ],
  "tags": ["Ages X-Y", "Duration", "Indoor/Outdoor"]
}`
  );
  try {
    const list = JSON.parse(raw.trim());
    const outPath = path.join('data', 'new-weekend-lists.json');
    let existing = [];
    if (fs.existsSync(outPath)) existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    existing.push({ ...list, dateAdded: TODAY });
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    log(`✓ Weekend list saved: ${list.title}`);
    return list;
  } catch(e) {
    log(`✗ Weekend list parse failed: ${e.message}`);
    return null;
  }
}

// ── WEDNESDAY: Social posts ───────────────────────────────────────────────────
async function generateSocialPosts() {
  log('Generating social posts...');

  // Read this week's new content to reference
  let weekContent = 'science experiments for families';
  try {
    const expPath = path.join('data', 'new-experiments.json');
    if (fs.existsSync(expPath)) {
      const exps = JSON.parse(fs.readFileSync(expPath, 'utf8'));
      const latest = exps[exps.length - 1];
      if (latest) weekContent = `${latest.name} — ${latest.why}`;
    }
  } catch(e) {}

  const raw = await generate(
    `You write social media content for raisedcurious.com, a family science/activity website. Tone: confident, warm, direct. Not salesy, not preachy. No hashtag spam. Output ONLY valid JSON.`,
    `Write social content inspired by this week's theme: "${weekContent}" for the ${SEASON} season.

Return ONLY this JSON:
{
  "instagram": [
    {"caption": "Post 1 caption (2-4 sentences, ends with a question to drive comments)", "hashtags": "#science #kidsactivities #homeschool #raisedcurious"},
    {"caption": "Post 2 caption (experiment or activity tip, specific and useful)", "hashtags": "#familyscience #weekendactivities #scienceforkids"},
    {"caption": "Post 3 caption (inspiring/thoughtful, about curiosity or learning)", "hashtags": "#parentingtips #raisecuriousnkids #familytime"}
  ],
  "pinterest": [
    {"title": "Pin title (SEO-friendly, describes the content)", "description": "2-3 sentence pin description"},
    {"title": "Pin title", "description": "2-3 sentence pin description"}
  ],
  "twitter": [
    {"text": "Tweet 1 (under 240 chars, punchy science fact or tip)"},
    {"text": "Tweet 2 (under 240 chars, weekend idea or experiment prompt)"}
  ]
}`
  );
  try {
    const posts = JSON.parse(raw.trim());
    const outPath = path.join('data', 'social-posts.json');
    let existing = [];
    if (fs.existsSync(outPath)) existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    existing.push({ ...posts, dateGenerated: TODAY });
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    log('✓ Social posts saved');
    return posts;
  } catch(e) {
    log(`✗ Social posts parse failed: ${e.message}`);
    return null;
  }
}

// ── THURSDAY: Printable activity ─────────────────────────────────────────────
async function generatePrintable() {
  log('Generating printable activity...');
  const raw = await generate(
    `You write printable activity content for raisedcurious.com. Output ONLY valid JSON. No markdown.`,
    `Generate a printable activity for ${SEASON}. Could be a scavenger hunt, word search, crossword, activity sheet, observation log, or checklist. Be specific and genuinely useful.

Return ONLY this JSON:
{
  "type": "Scavenger Hunt|Word Search|Activity Sheet|Observation Log|Checklist",
  "title": "Printable title",
  "ageRange": "Ages X-Y",
  "season": "${SEASON}",
  "timeNeeded": "time estimate",
  "description": "2-3 sentence description of what the printable contains",
  "content": {
    "instructions": "Brief instructions for the activity",
    "items": ["item 1", "item 2", "item 3", "item 4", "item 5", "item 6", "item 7", "item 8", "item 9", "item 10"]
  }
}`
  );
  try {
    const printable = JSON.parse(raw.trim());
    const outPath = path.join('data', 'new-printables.json');
    let existing = [];
    if (fs.existsSync(outPath)) existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    existing.push({ ...printable, dateAdded: TODAY });
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    log(`✓ Printable saved: ${printable.title}`);
    return printable;
  } catch(e) {
    log(`✗ Printable parse failed: ${e.message}`);
    return null;
  }
}

// ── FRIDAY: Newsletter draft ──────────────────────────────────────────────────
async function generateNewsletter() {
  log('Generating newsletter draft...');

  let weekSummary = '';
  try {
    const paths = ['data/new-experiments.json','data/new-weekend-lists.json','data/new-printables.json'];
    paths.forEach(p => {
      if (fs.existsSync(p)) {
        const items = JSON.parse(fs.readFileSync(p, 'utf8'));
        const latest = items[items.length-1];
        if (latest) weekSummary += `\n- ${latest.title || latest.name || 'New content'}`;
      }
    });
  } catch(e) {}

  const raw = await generate(
    `You write a weekly email newsletter for raisedcurious.com. Voice: warm, smart, direct. Like a message from a thoughtful parent who reads a lot. Not corporate, not salesy. Output ONLY valid JSON.`,
    `Write this week's newsletter for ${SEASON}. This week's new content includes:${weekSummary || '\n- New experiment\n- Weekend checklist\n- Free printable'}

Return ONLY this JSON:
{
  "subject": "Email subject line (compelling, not clickbait)",
  "preview": "Preview text (shown before open, 90 chars max)",
  "greeting": "Opening line (1 sentence, conversational)",
  "intro": "2-3 sentences setting up the week",
  "sections": [
    {"emoji": "🧪", "heading": "This week in The Lab", "body": "2-3 sentences about the new experiment"},
    {"emoji": "📋", "heading": "Weekend idea", "body": "2-3 sentences about the weekend list"},
    {"emoji": "🖨️", "heading": "Free printable", "body": "1-2 sentences about the printable"},
    {"emoji": "💡", "heading": "Something to think about", "body": "A short observation or science fact relevant to the season. Not preachy."}
  ],
  "closing": "1-2 sentence warm sign-off"
}`
  );
  try {
    const newsletter = JSON.parse(raw.trim());
    const outPath = path.join('data', 'newsletters.json');
    let existing = [];
    if (fs.existsSync(outPath)) existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    existing.push({ ...newsletter, dateGenerated: TODAY, status: 'draft' });
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    log('✓ Newsletter draft saved');
    return newsletter;
  } catch(e) {
    log(`✗ Newsletter parse failed: ${e.message}`);
    return null;
  }
}

// ── SATURDAY: Outside guide ───────────────────────────────────────────────────
async function generateOutsideGuide() {
  log('Generating outside guide...');
  const raw = await generate(
    `You write outdoor nature content for raisedcurious.com. Specific, scientifically accurate, genuinely useful for families. Output ONLY valid JSON.`,
    `Generate an outdoor activity guide for ${SEASON}. Should involve observation, science, or a specific outdoor challenge.

Return ONLY this JSON:
{
  "title": "Guide title",
  "season": "${SEASON}",
  "label": "Season + context (e.g. 'Spring · Outdoors')",
  "ageRange": "Ages X+",
  "timeNeeded": "duration estimate",
  "location": "where to do it",
  "intro": "2-3 sentences. Why this is interesting right now.",
  "items": [
    {"t": "Activity or observation", "s": "Specific tip or detail"},
    {"t": "Activity or observation", "s": "Specific tip or detail"},
    {"t": "Activity or observation", "s": "Specific tip or detail"},
    {"t": "Activity or observation", "s": "Specific tip or detail"},
    {"t": "Activity or observation", "s": "Specific tip or detail"},
    {"t": "Activity or observation", "s": "Specific tip or detail"},
    {"t": "Activity or observation", "s": "Specific tip or detail"},
    {"t": "Activity or observation", "s": "Specific tip or detail"}
  ]
}`
  );
  try {
    const guide = JSON.parse(raw.trim());
    const outPath = path.join('data', 'new-outside-guides.json');
    let existing = [];
    if (fs.existsSync(outPath)) existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    existing.push({ ...guide, dateAdded: TODAY });
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    log(`✓ Outside guide saved: ${guide.title}`);
    return guide;
  } catch(e) {
    log(`✗ Outside guide parse failed: ${e.message}`);
    return null;
  }
}

// ── SUNDAY: Weekly report ─────────────────────────────────────────────────────
async function generateWeeklyReport() {
  log('Generating weekly report...');
  const dataFiles = ['new-experiments.json','new-weekend-lists.json','new-printables.json','newsletters.json','new-outside-guides.json','social-posts.json'];
  const report = {
    weekEnding: TODAY,
    season: SEASON,
    generated: {}
  };
  dataFiles.forEach(f => {
    const p = path.join('data', f);
    if (fs.existsSync(p)) {
      const items = JSON.parse(fs.readFileSync(p, 'utf8'));
      const thisWeek = items.filter(i => {
        const d = new Date(i.dateAdded || i.dateGenerated || '');
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return d > weekAgo;
      });
      report.generated[f] = thisWeek.length;
    }
  });
  fs.writeFileSync(path.join('data', 'weekly-reports.json'),
    JSON.stringify([...(fs.existsSync('data/weekly-reports.json') ? JSON.parse(fs.readFileSync('data/weekly-reports.json','utf8')) : []), report], null, 2));
  log('✓ Weekly report saved');
  return report;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  log(`=== RaisedCurious nightly run — Day ${DAY} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][DAY]}) ===`);

  // Ensure data directory exists
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });

  try {
    switch (DAY) {
      case 1: await generateExperiment(); break;      // Monday
      case 2: await generateWeekendList(); break;     // Tuesday
      case 3: await generateSocialPosts(); break;     // Wednesday
      case 4: await generatePrintable(); break;       // Thursday
      case 5: await generateNewsletter(); break;      // Friday
      case 6: await generateOutsideGuide(); break;    // Saturday
      case 0: await generateWeeklyReport(); break;    // Sunday
    }
    log('=== Run complete ===');
  } catch(err) {
    log(`✗ Fatal error: ${err.message}`);
    process.exit(1);
  }
}

main();

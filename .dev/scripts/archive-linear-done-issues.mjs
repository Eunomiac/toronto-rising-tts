#!/usr/bin/env node
/**
 * Bulk-archive Done/Canceled Linear issues to free free-tier active issue quota (250).
 *
 * Linear has no manual archive in UI; auto-archive is time-delayed. The GraphQL
 * issueArchive mutation works immediately. Archived issues remain searchable (G X).
 *
 * Usage:
 *   set LINEAR_API_KEY=lin_api_...   (PowerShell: $env:LINEAR_API_KEY="...")
 *   node .dev/scripts/archive-linear-done-issues.mjs --dry-run
 *   node .dev/scripts/archive-linear-done-issues.mjs
 *   node .dev/scripts/archive-linear-done-issues.mjs --keep-recent 40
 *
 * Options:
 *   --dry-run          List what would be archived; no mutations
 *   --keep-recent N    Keep N most recently completed/canceled issues (default 35)
 *   --team-id ID       Linear team UUID (default: Toronto Rising)
 *   --delay-ms N       Pause between archive calls (default 120)
 */

import fs from "fs";
import path from "path";

const TEAM_ID = "eeeed08e-75d8-4278-a1e0-9859d21421b3";
const API_URL = "https://api.linear.app/graphql";

const KEEP_LABELS = new Set(["living-doc"]);

/** Load repo-root `.env` when LINEAR_API_KEY is not already set. */
function loadEnvFile() {
  if (process.env.LINEAR_API_KEY) return;
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    keepRecent: 35,
    teamId: TEAM_ID,
    delayMs: 120,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--keep-recent") opts.keepRecent = Number(argv[++i] ?? 35);
    else if (a === "--team-id") opts.teamId = argv[++i];
    else if (a === "--delay-ms") opts.delayMs = Number(argv[++i] ?? 120);
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node .dev/scripts/archive-linear-done-issues.mjs [options]

  --dry-run          Preview only
  --keep-recent N    Keep N newest closed issues (default 35)
  --team-id ID       Team UUID
  --delay-ms N       Delay between archives (default 120)
`);
      process.exit(0);
    }
  }
  return opts;
}

async function gql(apiKey, query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors?.length) {
    throw new Error(
      json.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`,
    );
  }
  return json.data;
}

async function fetchClosedIssues(apiKey, teamId) {
  const query = `
    query ClosedIssues($teamId: String!, $after: String) {
      team(id: $teamId) {
        issues(
          first: 50
          after: $after
          includeArchived: false
          filter: {
            state: { type: { in: ["completed", "canceled"] } }
          }
        ) {
          nodes {
            id
            identifier
            title
            completedAt
            canceledAt
            updatedAt
            labels { nodes { name } }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;
  const all = [];
  let after = null;
  for (;;) {
    const data = await gql(apiKey, query, { teamId, after });
    const conn = data.team?.issues;
    if (!conn) break;
    all.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return all;
}

function closedAt(issue) {
  return issue.completedAt || issue.canceledAt || issue.updatedAt || "";
}

function hasKeepLabel(issue) {
  return (issue.labels?.nodes ?? []).some((l) => KEEP_LABELS.has(l.name));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function archiveIssue(apiKey, id) {
  const mutation = `
    mutation Archive($id: String!) {
      issueArchive(id: $id) {
        success
        entity { id identifier archivedAt }
      }
    }
  `;
  const data = await gql(apiKey, mutation, { id });
  return data.issueArchive;
}

async function main() {
  loadEnvFile();
  const opts = parseArgs(process.argv);
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error(
      "LINEAR_API_KEY is not set. Create one at Linear → Settings → Account → API → Personal API keys.",
    );
    process.exit(1);
  }

  console.log("Fetching closed (Done/Canceled) non-archived issues…");
  const closed = await fetchClosedIssues(apiKey, opts.teamId);
  console.log(`Found ${closed.length} closed non-archived issues.`);

  const sorted = [...closed].sort((a, b) => closedAt(a).localeCompare(closedAt(b)));
  const keep = new Set();
  for (const issue of sorted) {
    if (hasKeepLabel(issue)) keep.add(issue.id);
  }
  const recent = [...sorted]
    .sort((a, b) => closedAt(b).localeCompare(closedAt(a)))
    .slice(0, opts.keepRecent);
  for (const issue of recent) keep.add(issue.id);

  const toArchive = sorted.filter((i) => !keep.has(i.id));
  console.log(
    `Keeping ${keep.size} (${opts.keepRecent} most recent + ${KEEP_LABELS.size ? [...KEEP_LABELS].join(", ") + " label" : "labels"}).`,
  );
  console.log(`Will archive ${toArchive.length} issues${opts.dryRun ? " (dry-run)" : ""}.`);

  if (toArchive.length === 0) {
    console.log("Nothing to archive.");
    return;
  }

  if (opts.dryRun) {
    for (const issue of toArchive) {
      console.log(`  ${issue.identifier}  ${closedAt(issue).slice(0, 10)}  ${issue.title}`);
    }
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const issue of toArchive) {
    try {
      const result = await archiveIssue(apiKey, issue.id);
      if (result?.success) {
        ok++;
        process.stdout.write(`archived ${issue.identifier}\n`);
      } else {
        fail++;
        console.error(`failed ${issue.identifier}: success=false`);
      }
    } catch (err) {
      fail++;
      console.error(`failed ${issue.identifier}: ${err.message}`);
    }
    if (opts.delayMs > 0) await sleep(opts.delayMs);
  }
  console.log(`Done. Archived ${ok}, failed ${fail}.`);
  console.log("Try creating a test issue in Linear to confirm quota is restored.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

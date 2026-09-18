// Generates assets/github-stats.svg from the GitHub GraphQL API.
// Replaces github-readme-stats.vercel.app, whose public instance went offline
// (HTTP 503 DEPLOYMENT_PAUSED) and broke the card on the profile.
//
// Usage: GITHUB_TOKEN=... node .github/scripts/github-stats.mjs <user> <output.svg>

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const [login = 'CodaxiKing', output = 'assets/github-stats.svg'] = process.argv.slice(2);
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error('GITHUB_TOKEN is required');
  process.exit(1);
}

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`GitHub API error: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data;
}

const PROFILE = `
  query ($login: String!) {
    user(login: $login) {
      name
      contributionsCollection { totalCommitContributions }
      pullRequests { totalCount }
      issues { totalCount }
      repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, REPOSITORY]) { totalCount }
    }
  }`;

const REPOS = `
  query ($login: String!, $cursor: String) {
    user(login: $login) {
      repositories(ownerAffiliations: OWNER, isFork: false, first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { stargazerCount }
      }
    }
  }`;

// Stars are summed across every page: a single page of 100 would undercount.
async function totalStars() {
  let stars = 0;
  let cursor = null;
  do {
    const { user } = await graphql(REPOS, { login, cursor });
    const page = user.repositories;
    stars += page.nodes.reduce((sum, repo) => sum + repo.stargazerCount, 0);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return stars;
}

const escapeXml = (text) =>
  String(text).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n);

function renderSvg(name, rows) {
  const rowHeight = 30;
  const top = 70;
  const height = top + rows.length * rowHeight + 10;

  const items = rows
    .map(
      ({ label, value }, i) => `
    <g transform="translate(25, ${top + i * rowHeight})">
      <circle cx="6" cy="-5" r="5" class="icon" />
      <text x="22" y="0" class="label">${escapeXml(label)}:</text>
      <text x="300" y="0" class="value">${escapeXml(formatNumber(value))}</text>
    </g>`,
    )
    .join('');

  // Transparent background with colors that follow the viewer's theme, so the card
  // reads well on both GitHub light and dark.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${height}" viewBox="0 0 480 ${height}" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(name)}'s GitHub statistics</title>
  <style>
    .title { font: 600 18px 'Segoe UI', Ubuntu, sans-serif; fill: #38BDF8; }
    .label { font: 600 14px 'Segoe UI', Ubuntu, sans-serif; fill: #333333; }
    .value { font: 700 14px 'Segoe UI', Ubuntu, sans-serif; fill: #333333; }
    .icon { fill: #38BDF8; }
    @media (prefers-color-scheme: dark) {
      .label, .value { fill: #C9D1D9; }
    }
  </style>
  <text x="25" y="35" class="title">${escapeXml(name)}'s GitHub Stats</text>${items}
</svg>
`;
}

const { user } = await graphql(PROFILE, { login });
if (!user) {
  throw new Error(`User ${login} not found`);
}

const rows = [
  { label: 'Total Stars Earned', value: await totalStars() },
  { label: 'Commits (last year)', value: user.contributionsCollection.totalCommitContributions },
  { label: 'Total PRs', value: user.pullRequests.totalCount },
  { label: 'Total Issues', value: user.issues.totalCount },
  { label: 'Contributed to (last year)', value: user.repositoriesContributedTo.totalCount },
];

await mkdir(dirname(output), { recursive: true });
await writeFile(output, renderSvg(user.name || login, rows));
console.log(`Wrote ${output}`, Object.fromEntries(rows.map((r) => [r.label, r.value])));

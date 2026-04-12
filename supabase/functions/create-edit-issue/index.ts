import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')!;
const GITHUB_REPO = 'alyssafuward/open-room-open-source';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { registryId, githubUsername, gridX, gridY } = await req.json();

  if (!registryId || !githubUsername) {
    return new Response('Missing required fields', { status: 400 });
  }

  const title = `Edit request: ${registryId} (@${githubUsername})`;
  const body = [
    `An edit has been requested for this room.`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Registry ID | \`${registryId}\` |`,
    `| GitHub | @${githubUsername} |`,
    `| Grid position | (${gridX ?? '?'}, ${gridY ?? '?'}) |`,
    ``,
    `**Next step:** @${githubUsername} should fork the repo, update \`public/registry/${registryId}/\`, and open a PR.`,
  ].join('\n');

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body, labels: ['room'] }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('GitHub API error:', error);
    return new Response('Failed to create issue', { status: 500 });
  }

  const issue = await response.json();
  console.log(`Created issue #${issue.number}: ${title}`);
  return new Response(JSON.stringify({ issue: issue.number, url: issue.html_url }), { status: 200 });
});

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = process.env.WIPLASH_MCP_SMOKE_URL || 'http://127.0.0.1:8787/mcp';
const expectedTools = new Set([
  'search_posts',
  'get_post',
  'find_agents',
  'get_agent',
  'list_hot_topics',
  'get_waterpark_rules',
]);

const client = new Client({ name: 'wiplash-mcp-live-smoke', version: '0.1.0' });
const transport = new StreamableHTTPClientTransport(new URL(endpoint));

function requireSuccess(result, toolName) {
  if (result.isError || !result.structuredContent) {
    throw new Error(`${toolName} did not return a successful structured result.`);
  }
  return result.structuredContent;
}

try {
  await client.connect(transport);

  const listed = await client.listTools();
  const actualTools = new Set(listed.tools.map((tool) => tool.name));
  const missing = [...expectedTools].filter((tool) => !actualTools.has(tool));
  if (missing.length > 0) {
    throw new Error(`Missing MCP tools: ${missing.join(', ')}`);
  }

  const search = requireSuccess(
    await client.callTool({ name: 'search_posts', arguments: { query: '', limit: 2 } }),
    'search_posts',
  );
  if (search.untrusted_content !== true) {
    throw new Error('search_posts did not return a successful, explicitly untrusted result.');
  }

  const firstPostId = search.posts?.[0]?.post_id;
  if (!firstPostId) {
    throw new Error('search_posts returned no post that could be used for get_post.');
  }
  requireSuccess(
    await client.callTool({ name: 'get_post', arguments: { post_id: firstPostId } }),
    'get_post',
  );

  const agents = requireSuccess(
    await client.callTool({ name: 'find_agents', arguments: { query: '', limit: 2 } }),
    'find_agents',
  );
  const firstHandle = agents.agents?.[0]?.handle;
  if (!firstHandle) {
    throw new Error('find_agents returned no handle that could be used for get_agent.');
  }
  requireSuccess(
    await client.callTool({ name: 'get_agent', arguments: { handle: firstHandle } }),
    'get_agent',
  );

  const topics = requireSuccess(
    await client.callTool({ name: 'list_hot_topics', arguments: { limit: 2 } }),
    'list_hot_topics',
  );

  const rules = requireSuccess(
    await client.callTool({ name: 'get_waterpark_rules', arguments: {} }),
    'get_waterpark_rules',
  );
  if (rules.untrusted_content !== false) {
    throw new Error('get_waterpark_rules did not return a successful public-rules result.');
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        endpoint,
        tools: [...actualTools].sort(),
        search_result_count: search.result_count,
        sampled_post_id: firstPostId,
        sampled_agent_handle: firstHandle,
        topic_result_count: topics.topics?.length ?? 0,
        rules_source: rules.source,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await client.close().catch(() => undefined);
}

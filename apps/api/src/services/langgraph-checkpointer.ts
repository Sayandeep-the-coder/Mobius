// @ts-nocheck
/**
 * LangGraph PostgreSQL Checkpointer Configuration
 *
 * Uses PostgreSQL as the persistence layer for LangGraph agent state,
 * enabling durable multi-step agent workflows across restarts.
 *
 * Required tables (created by scripts/init-db.sql):
 * - checkpoints
 * - checkpoint_writes
 */

import { PostgresSaver } from '@langchain/langgraph-postgres';
import { Pool } from 'pg';

/**
 * Create a LangGraph checkpointer backed by PostgreSQL.
 *
 * The checkpointer stores:
 * - Agent state snapshots (for resume/replay)
 * - Checkpoint metadata (for time-travel debugging)
 * - Task writes (for streaming intermediate results)
 *
 * @param connectionString - PostgreSQL connection string
 */
export function createPostgresCheckpointer(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection on startup
  pool.on('connect', () => {
    console.log('[LangGraph] PostgreSQL checkpointer connected');
  });

  pool.on('error', (err) => {
    console.error('[LangGraph] PostgreSQL checkpointer error:', err);
  });

  const checkpointer = new PostgresSaver(pool);

  return { checkpointer, pool };
}

/**
 * Example usage in your LangGraph agent:
 *
 * import { createPostgresCheckpointer } from './langgraph-checkpointer';
 *
 * const { checkpointer } = createPostgresCheckpointer(process.env.DATABASE_URL);
 *
 * const graph = new StateGraph(MyState)
 *   .addNode('agent', agentNode)
 *   .addEdge('__start__', 'agent')
 *   .compile({ checkpointer });
 *
 * // Thread ID = user ID or session ID for persistent conversations
 * const result = await graph.invoke(input, { configurable: { thread_id: userId } });
 */

-- Mobius database initialization

-- LangGraph checkpointer tables
CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT NOT NULL,
  checkpoint BYTEA NOT NULL,
  metadata BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS checkpoint_writes (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  channel TEXT NOT NULL,
  value BYTEA NOT NULL,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- Mobius application tables
CREATE TABLE IF NOT EXISTS agent_policies (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  allowed_chains JSONB NOT NULL DEFAULT '[]',
  allowed_actions JSONB NOT NULL DEFAULT '[]',
  max_amount_per_action TEXT NOT NULL DEFAULT '0',
  max_total_per_session TEXT NOT NULL DEFAULT '0',
  allowed_assets JSONB NOT NULL DEFAULT '[]',
  expires_at BIGINT,
  require_human_approval_above TEXT DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_positions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  position_type TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount TEXT NOT NULL,
  health_factor TEXT,
  liquidation_distance TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_records (
  id SERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  tx_hash TEXT,
  block_number TEXT,
  predicted_state JSONB,
  actual_state JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  included_at TIMESTAMP WITH TIME ZONE,
  safe_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agent_policies_user ON agent_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_user ON user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_records_plan ON execution_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_execution_records_status ON execution_records(status);

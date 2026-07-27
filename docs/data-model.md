# Datamodel (PostgreSQL)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  entra_oid VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  role VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
  id UUID PRIMARY KEY,
  reference VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  municipality VARCHAR(120) NOT NULL,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP,
  address TEXT NOT NULL,
  attendance_exact INT,
  nature VARCHAR(32),
  organizer_name VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(64),
  notes TEXT,
  status VARCHAR(32) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  factors JSONB NOT NULL,
  d1_score NUMERIC(8,2) NOT NULL,
  d2_score NUMERIC(8,2) NOT NULL,
  d3_score NUMERIC(8,2) NOT NULL,
  d1_rn SMALLINT NOT NULL,
  d2_rn SMALLINT NOT NULL,
  d3_rn SMALLINT NOT NULL,
  auto_rn SMALLINT NOT NULL,
  manual_rn SMALLINT,
  final_rn SMALLINT NOT NULL,
  override_reason TEXT,
  protocol_version VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE advice_requests (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  discipline VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL,
  advice_text TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(64),
  storage_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE external_links (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  platform VARCHAR(32) NOT NULL,
  external_id VARCHAR(128) NOT NULL,
  sync_status VARCHAR(32) NOT NULL DEFAULT 'synced',
  last_inbound_at TIMESTAMP,
  last_outbound_at TIMESTAMP,
  feedback_pending BOOLEAN NOT NULL DEFAULT FALSE,
  last_change TEXT,
  UNIQUE(platform, external_id)
);

CREATE TABLE sync_queue (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  platform VARCHAR(32) NOT NULL,
  direction VARCHAR(8) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  platform VARCHAR(32) NOT NULL,
  direction VARCHAR(8) NOT NULL,
  result VARCHAR(32) NOT NULL,
  message TEXT,
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_advice_event ON advice_requests(event_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status, next_attempt_at);
CREATE INDEX idx_sync_logs_created ON sync_logs(created_at DESC);
```

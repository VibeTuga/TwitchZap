-- Enable Supabase Realtime for tables that use postgres_changes subscriptions.
-- This adds them to the supabase_realtime publication so INSERT/UPDATE/DELETE
-- events are broadcast to connected clients.

alter publication supabase_realtime add table queue;
alter publication supabase_realtime add table broadcasts;
alter publication supabase_realtime add table votes;

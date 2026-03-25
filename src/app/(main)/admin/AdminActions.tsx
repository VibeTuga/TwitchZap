"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

// --- Queue Remove Button ---

export function AdminQueueRemoveButton({
  queueEntryId,
  streamName,
}: {
  queueEntryId: string;
  streamName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!window.confirm(`Remove "${streamName}" from the queue?`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue_entry_id: queueEntryId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove entry");
        return;
      }

      toast.success(`Removed "${streamName}" from queue`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50"
    >
      {loading ? "Removing…" : "Remove"}
    </button>
  );
}

// --- Broadcast Control Buttons ---

export function AdminBroadcastActions({
  broadcastId,
  streamName,
}: {
  broadcastId: string;
  streamName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"end" | "skip" | null>(null);

  async function handleAction(action: "end" | "skip") {
    const label = action === "end" ? "End Broadcast" : "Skip to Next";
    if (!window.confirm(`${label} for "${streamName}"?`)) return;

    setLoading(action);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || `Failed to ${action} broadcast`);
        return;
      }

      toast.success(
        action === "end"
          ? "Broadcast ended"
          : "Skipped to next stream"
      );
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction("end")}
        disabled={loading !== null}
        className="px-4 py-2 rounded-xl bg-red-500/15 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        <span className="material-symbols-outlined text-base">stop_circle</span>
        {loading === "end" ? "Ending…" : "End Broadcast"}
      </button>
      <button
        onClick={() => handleAction("skip")}
        disabled={loading !== null}
        className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 text-sm font-semibold hover:bg-amber-500/25 transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        <span className="material-symbols-outlined text-base">skip_next</span>
        {loading === "skip" ? "Skipping…" : "Skip to Next"}
      </button>
    </div>
  );
}

// --- User Role Dropdown ---

export function AdminUserRoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(newRole: string) {
    if (newRole === currentRole) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
        return;
      }

      toast.success(`Role updated to ${newRole}`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={currentRole}
      onChange={(e) => handleRoleChange(e.target.value)}
      disabled={loading}
      className="bg-surface-container-high text-on-surface text-xs rounded-lg px-2 py-1 border-0 outline-none focus:ring-1 focus:ring-primary-dim disabled:opacity-50"
    >
      <option value="member">member</option>
      <option value="moderator">moderator</option>
      <option value="admin">admin</option>
    </select>
  );
}

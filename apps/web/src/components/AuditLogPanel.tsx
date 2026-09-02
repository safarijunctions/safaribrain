import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { AuditLogPage } from "../types";

// The support tool: "show me everything that happened to this request/
// quote/user" without needing an engineer to query the database directly.
export function AuditLogPanel() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const pageSize = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", page, entityType, entityId],
    queryFn: () =>
      api.get<AuditLogPage>(
        `/admin/audit-log?page=${page}&pageSize=${pageSize}` +
          (entityType ? `&entityType=${encodeURIComponent(entityType)}` : "") +
          (entityId ? `&entityId=${encodeURIComponent(entityId)}` : ""),
      ),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        Every consequential action in your organization, in one place — useful when a client or teammate reports something went wrong.
      </p>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Entity type</label>
          <input
            placeholder="e.g. Quote, EnquiryRequest"
            className="border border-stone-300 rounded px-2 py-1.5 text-xs w-44"
            value={entityType}
            onChange={(e) => {
              setPage(1);
              setEntityType(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Entity ID</label>
          <input
            placeholder="paste an ID to trace one record"
            className="border border-stone-300 rounded px-2 py-1.5 text-xs w-56"
            value={entityId}
            onChange={(e) => {
              setPage(1);
              setEntityId(e.target.value);
            }}
          />
        </div>
        {(entityType || entityId) && (
          <button
            className="text-xs text-clay-700 hover:underline pb-1.5"
            onClick={() => {
              setEntityType("");
              setEntityId("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-clay-900/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-clay-50/60 text-stone-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Who</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Entity</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row) => (
                <tr key={row.id} className="border-t border-stone-100 align-top">
                  <td className="px-4 py-2 text-stone-500 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{row.actor ? row.actor.fullName : <span className="text-stone-400">client / system</span>}</td>
                  <td className="px-4 py-2 font-medium text-clay-800 whitespace-nowrap">{row.action}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {row.entityType} <span className="text-stone-400">{row.entityId.slice(0, 10)}…</span>
                  </td>
                  <td className="px-4 py-2 text-stone-500 max-w-xs truncate" title={row.metadata ? JSON.stringify(row.metadata) : ""}>
                    {row.metadata ? JSON.stringify(row.metadata) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-stone-400">No matching activity yet.</p>}
      </div>

      {data && data.total > pageSize && (
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>
            Page {data.page} of {totalPages} · {data.total} entries
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border border-stone-300 rounded px-2 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border border-stone-300 rounded px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

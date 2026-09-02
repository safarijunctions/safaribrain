import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { OrgMember } from "../types";

// Mirrors Permission/UserRole in packages/shared/src/enums.ts — see the note
// in IntegrationsPanel.tsx on why these are plain string lists here rather
// than a runtime import from @safaribrain/shared.
const PERMISSIONS = [
  "APPROVE_QUOTE",
  "PUBLISH_FEE",
  "ISSUE_REFUND",
  "RUN_PAYOUT",
  "CHANGE_BANK_DETAILS",
  "PUBLISH_SAFETY_CONTENT",
  "MODERATE_LISTING",
  "MANAGE_USERS",
  "MANAGE_INTEGRATIONS",
] as const;

const ROLES = ["CLIENT", "GUIDE", "OPERATOR", "AGENT", "ADMIN"] as const;

export function UsersPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["org-members"], queryFn: () => api.get<OrgMember[]>("/admin/users") });
  const [showForm, setShowForm] = useState(false);
  const [tempPasswordNotice, setTempPasswordNotice] = useState<{ email: string; password: string } | null>(null);

  const remove = useMutation({
    mutationFn: (membershipId: string) => api.delete(`/admin/users/${membershipId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members"] }),
  });

  const resetPassword = useMutation({
    mutationFn: (membershipId: string) => api.post<{ email: string; tempPassword: string }>(`/admin/users/${membershipId}/reset-password`),
    onSuccess: (res) => setTempPasswordNotice({ email: res.email, password: res.tempPassword }),
  });

  const togglePermission = useMutation({
    mutationFn: ({ membershipId, permissions }: { membershipId: string; permissions: string[] }) =>
      api.patch(`/admin/users/${membershipId}`, { permissions }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members"] }),
  });

  return (
    <div className="space-y-6">
      {tempPasswordNotice && (
        <div className="bg-sunset-50 border border-sunset-200 rounded-xl p-4 text-sm">
          <p className="font-medium">
            One-time password for {tempPasswordNotice.email}: <code className="bg-white px-1.5 py-0.5 rounded border">{tempPasswordNotice.password}</code>
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Share this with them directly — it won't be shown again. (Once an email/SMS integration is configured, invites will be delivered
            automatically instead.)
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-500">{data?.length ?? 0} people have access to this organization.</p>
        <button onClick={() => setShowForm((s) => !s)} className="bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition">
          {showForm ? "Close" : "+ Invite person"}
        </button>
      </div>

      {showForm && (
        <InviteForm
          onInvited={(res) => {
            setShowForm(false);
            if (res.tempPassword) setTempPasswordNotice({ email: res.user.email, password: res.tempPassword });
            qc.invalidateQueries({ queryKey: ["org-members"] });
          }}
        />
      )}

      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-clay-900/5 overflow-hidden">
        {data?.map((m) => (
          <div key={m.id} className="px-5 py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-sm">{m.user.fullName}</p>
                <p className="text-xs text-stone-500">
                  {m.user.email} · {m.role}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => resetPassword.mutate(m.id)}
                  disabled={resetPassword.isPending}
                  className="text-xs text-clay-700 hover:underline disabled:opacity-50"
                  title="Generate a new one-time password for this person — helps when they're locked out"
                >
                  Reset password
                </button>
                <button onClick={() => remove.mutate(m.id)} className="text-xs text-red-500 hover:underline">
                  Remove access
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-1 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={m.permissions.includes(p)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...m.permissions, p] : m.permissions.filter((x) => x !== p);
                      togglePermission.mutate({ membershipId: m.id, permissions: next });
                    }}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InviteForm({ onInvited }: { onInvited: (res: { user: { email: string }; tempPassword: string | null }) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("OPERATOR");

  const invite = useMutation({
    mutationFn: () => api.post<{ user: { email: string }; tempPassword: string | null }>("/admin/users/invite", { fullName, email, role, permissions: [] }),
    onSuccess: onInvited,
  });

  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-clay-50/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-medium mb-1">Full name</label>
        <input className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Email</label>
        <input type="email" className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Role</label>
        <select className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-3">
        {invite.isError && <p className="text-xs text-red-600 mb-2">{(invite.error as Error).message}</p>}
        <button
          onClick={() => invite.mutate()}
          disabled={invite.isPending || !fullName || !email}
          className="bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition disabled:opacity-50"
        >
          {invite.isPending ? "Inviting…" : "Invite"}
        </button>
      </div>
    </div>
  );
}

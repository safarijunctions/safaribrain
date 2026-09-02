import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { TourTemplateSummary } from "../types";

// Phase 3 (§7) marketplace: which tour templates a prospective traveler can
// browse without an account. Off by default per-template — see
// MarketplaceController for the public-facing side.
export function ListingsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: () => api.get<TourTemplateSummary[]>("/products/tour-templates") });

  const toggle = useMutation({
    mutationFn: ({ id, publiclyListed }: { id: string; publiclyListed: boolean }) => api.patch(`/products/tour-templates/${id}/listing`, { publiclyListed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        Templates listed here appear on the public marketplace (no login required) for anyone browsing safaris across Africa.
      </p>
      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}
      <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-clay-900/5 overflow-hidden">
        {data?.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium text-sm">{t.title}</p>
              <p className="text-xs text-stone-500 mt-0.5">{t.durationDays} days · {t.summary}</p>
            </div>
            <label className="flex items-center gap-1.5 text-xs shrink-0">
              <input
                type="checkbox"
                checked={!!t.publiclyListed}
                onChange={(e) => toggle.mutate({ id: t.id, publiclyListed: e.target.checked })}
              />
              Publicly listed
            </label>
          </div>
        ))}
        {data?.length === 0 && <p className="px-5 py-8 text-center text-sm text-stone-400">No tour templates yet.</p>}
      </div>
    </div>
  );
}

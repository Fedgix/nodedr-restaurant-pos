"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useUpdateBranchSettings,
  useUpdateRestaurantSettings,
  useUploadRestaurantLogo,
  type BranchSettings,
  type RestaurantSettings,
} from "@/hooks/use-settings";
export function WebsiteCard({
  branchId,
  branch,
  restaurant,
}: {
  branchId: string | null;
  branch: BranchSettings;
  restaurant: RestaurantSettings;
}) {
  const [color, setColor] = useState(restaurant.brandColor);
  const [font, setFont] = useState(restaurant.fontFamily);
  const [headline, setHeadline] = useState(restaurant.websiteHeadline ?? "");
  const [hero, setHero] = useState(restaurant.heroImageUrl ?? "");
  const [enabled, setEnabled] = useState(branch.customerPortalEnabled);
  const saveRestaurant = useUpdateRestaurantSettings(branchId);
  const saveBranch = useUpdateBranchSettings(branchId);
  const upload = useUploadRestaurantLogo();
  const busy =
    saveRestaurant.isPending || saveBranch.isPending || upload.isPending;
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Customer website</h2>
      <p className="my-2 text-sm text-muted-foreground">
        Publish your menu, booking requests and collection orders. Customers pay
        at the counter.
      </p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await saveRestaurant.mutateAsync({
              brandColor: color,
              fontFamily: font as "system" | "serif" | "sans",
              websiteHeadline: headline || null,
              heroImageUrl: hero || null,
            });
            await saveBranch.mutateAsync({ customerPortalEnabled: enabled });
            toast.success("Website settings saved");
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : "Could not save settings",
            );
          }
        }}
      >
        <label className="text-sm">
          Brand color
          <input
            aria-label="Website brand color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-2 block h-12 w-24 rounded-lg border"
          />
        </label>
        <label className="text-sm">
          Typography
          <select
            className="mt-2 block min-h-12 w-full rounded-lg border border-border bg-background px-3"
            value={font}
            onChange={(e) => setFont(e.target.value)}
          >
            <option value="system">System</option>
            <option value="sans">Sans serif</option>
            <option value="serif">Serif</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Welcome headline
          <input
            className="mt-2 block min-h-12 w-full rounded-lg border border-border bg-background px-3"
            value={headline}
            maxLength={160}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Cover photography
          <input
            className="mt-2 block"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const result = await upload.mutateAsync(file);
                setHero(result.url);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Upload failed");
              }
            }}
          />
        </label>
        {hero && (
          <button
            type="button"
            className="text-left text-sm underline"
            onClick={() => setHero("")}
          >
            Remove cover photo
          </button>
        )}
        <label className="flex min-h-12 items-center gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable customer website for this branch
        </label>
        <button
          disabled={busy}
          className="min-h-12 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
        >
          {busy ? "Saving…" : "Save website"}
        </button>
        {branch.customerPortalEnabled && (
          <Link
            className="flex min-h-12 items-center underline"
            href={`/dine/${branch.id}`}
            target="_blank"
          >
            Open customer website
          </Link>
        )}
      </form>
    </section>
  );
}

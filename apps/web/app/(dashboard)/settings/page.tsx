"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  RESTAURANT_NAME_MAX_LENGTH,
  TAX_REGIME_PRESETS,
  TAX_REGIMES,
  type TaxMode,
  type TaxRegime,
} from "@nodedr-restaurant/types";
import { WebsiteCard } from "@/components/settings/website-card";
import { KioskCard } from "@/components/settings/kiosk-card";
import { PrinterDiagnosticsCard } from "@/components/settings/printer-diagnostics-card";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useBranch } from "@/hooks/use-branch";
import { useNotificationMute } from "@/hooks/use-notification-mute";
import {
  useSettings,
  useUpdateBranchSettings,
  useUpdateRestaurantSettings,
  useUploadRestaurantLogo,
  type BranchSettings,
  type RestaurantSettings,
} from "@/hooks/use-settings";
import { ApiError } from "@/lib/api";

export default function SettingsPage() {
  const { branchId } = useBranch();
  const { data, isLoading } = useSettings(branchId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Restaurant, branch, and staff configuration
        </p>
      </div>

      <SettingsTabs />

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <GeneralSettingsForm
          key={`${data.restaurant.id}-${data.branch.id}`}
          restaurant={data.restaurant}
          branch={data.branch}
          branchId={branchId}
        />
      )}

      {data && (
        <OnlineOrdersCard
          key={data.branch.id}
          branchId={branchId}
          branch={data.branch}
        />
      )}

      {data && (
        <KioskCard
          key={`kiosk-${data.branch.id}`}
          branchId={branchId}
          branch={data.branch}
        />
      )}

      {data && (
        <WebsiteCard
          key={`website-${data.branch.id}`}
          branchId={branchId}
          branch={data.branch}
          restaurant={data.restaurant}
        />
      )}

      <NotificationSettingsCard />

      <PrinterDiagnosticsCard />
    </div>
  );
}

function OnlineOrdersCard({
  branchId,
  branch,
}: {
  branchId: string | null;
  branch: { autoConfirmOrders: boolean; autoConfirmReservations: boolean };
}) {
  const update = useUpdateBranchSettings(branchId);
  const save = (dto: {
    autoConfirmOrders?: boolean;
    autoConfirmReservations?: boolean;
  }) =>
    update.mutate(dto, {
      onSuccess: () => toast.success("Saved"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Could not save"),
    });

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-[18px] font-medium text-foreground">
          Online orders &amp; table bookings
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose whether orders and bookings from your website are accepted
          automatically or wait for you to accept them. You can always cancel an
          order or booking from its window.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="auto-confirm-orders">
            Auto-confirm online orders
          </Label>
          <p className="text-xs text-muted-foreground">
            Off = each new order rings, then waits for you to Accept or Reject
            before it reaches the kitchen. On = sent to the kitchen straight
            away.
          </p>
        </div>
        <Switch
          id="auto-confirm-orders"
          checked={branch.autoConfirmOrders}
          disabled={update.isPending}
          onCheckedChange={(v) => save({ autoConfirmOrders: v })}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="auto-confirm-bookings">
            Auto-confirm table bookings
          </Label>
          <p className="text-xs text-muted-foreground">
            Off = new bookings wait for you to Accept. On = confirmed
            automatically.
          </p>
        </div>
        <Switch
          id="auto-confirm-bookings"
          checked={branch.autoConfirmReservations}
          disabled={update.isPending}
          onCheckedChange={(v) => save({ autoConfirmReservations: v })}
        />
      </div>
    </Card>
  );
}

function NotificationSettingsCard() {
  const [muted, toggleMuted] = useNotificationMute();

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-[18px] font-medium text-foreground">
          Notifications
        </h2>
        <p className="text-sm text-muted-foreground">
          New orders, table reservations, and kitchen tickets on this device.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="notification-sound">Notification sound</Label>
          <p className="text-xs text-muted-foreground">
            Plays a chime for new orders, reservations, and kitchen display
            tickets. This only affects this device/browser — mute the kitchen
            display separately from the office if needed.
          </p>
        </div>
        <Switch
          id="notification-sound"
          checked={!muted}
          onCheckedChange={() => toggleMuted()}
        />
      </div>
    </Card>
  );
}

function GeneralSettingsForm({
  restaurant,
  branch,
  branchId,
}: {
  restaurant: RestaurantSettings;
  branch: BranchSettings;
  branchId: string | null;
}) {
  const [name, setName] = useState(restaurant.name);
  const [legalName, setLegalName] = useState(restaurant.legalName ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(restaurant.logoUrl);
  const [currency, setCurrency] = useState(restaurant.currency);
  const [timezone, setTimezone] = useState(restaurant.timezone);
  const [upiVpa, setUpiVpa] = useState(restaurant.upiVpa ?? "");
  const [upiPayeeName, setUpiPayeeName] = useState(
    restaurant.upiPayeeName ?? "",
  );
  const [loyaltyPointValue, setLoyaltyPointValue] = useState(
    restaurant.loyaltyPointValue,
  );
  const [loyaltyEarnPerCurrency, setLoyaltyEarnPerCurrency] = useState(
    String(restaurant.loyaltyEarnPerCurrency),
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const uploadLogo = useUploadRestaurantLogo();

  const [branchName, setBranchName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address ?? "");
  const [phone, setPhone] = useState(branch.phone ?? "");
  const [gstNumber, setGstNumber] = useState(branch.gstNumber ?? "");
  const [country, setCountry] = useState(branch.country);
  const [taxRegime, setTaxRegime] = useState<TaxRegime>(branch.taxRegime);
  const [taxMode, setTaxMode] = useState<TaxMode>(branch.taxMode);
  const [taxLabel, setTaxLabel] = useState(branch.taxLabel ?? "");
  const [taxId, setTaxId] = useState(branch.taxId ?? "");

  const preset = TAX_REGIME_PRESETS[taxRegime];

  const updateRestaurant = useUpdateRestaurantSettings(branchId);
  const updateBranch = useUpdateBranchSettings(branchId);

  const onSubmitRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    updateRestaurant.mutate(
      {
        name,
        legalName: legalName || undefined,
        logoUrl,
        currency,
        timezone,
        upiVpa: upiVpa.trim() || null,
        upiPayeeName: upiPayeeName.trim() || null,
        loyaltyPointValue: Number(loyaltyPointValue) || 0,
        loyaltyEarnPerCurrency: Number(loyaltyEarnPerCurrency) || 1,
      },
      {
        onSuccess: () => toast.success("Restaurant details saved"),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not save"),
      },
    );
  };

  const onSubmitBranch = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranch.mutate(
      {
        name: branchName,
        address: address || undefined,
        phone: phone || undefined,
        gstNumber: gstNumber || undefined,
        country,
        taxRegime,
        taxMode,
        taxLabel: taxLabel || null,
        taxId: taxId || null,
      },
      {
        onSuccess: () => toast.success("Branch details saved"),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not save"),
      },
    );
  };

  const onRegimeChange = (value: TaxRegime | null) => {
    if (!value) return;
    setTaxRegime(value);
    // Switching regimes resets to that regime's own mode/country by
    // default — a picker that silently kept the old mode would quietly
    // mis-price every item on this branch (see settings.service.ts).
    setTaxMode(TAX_REGIME_PRESETS[value].defaultMode);
    setCountry(TAX_REGIME_PRESETS[value].defaultCountry);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-[18px] font-medium text-foreground">Restaurant</h2>
        <form onSubmit={onSubmitRestaurant} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  uploadLogo.mutate(file, {
                    onSuccess: (res) => setLogoUrl(res.url),
                    onError: (err) =>
                      toast.error(
                        err instanceof ApiError
                          ? err.message
                          : "Could not upload logo",
                      ),
                  });
                }}
              />
              {logoUrl ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded asset served from the backend, not a Next-optimizable remote source */}
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl(null);
                      if (logoInputRef.current) logoInputRef.current.value = "";
                    }}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-foreground"
                    aria-label="Remove logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                  className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="text-[10px]">
                    {uploadLogo.isPending ? "Uploading…" : "Upload"}
                  </span>
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                Shows in the app sidebar and login screen instead of the
                OrderRestro mark. Square, at least 256×256px, PNG with a
                transparent background works best.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-name">Name</Label>
            <Input
              id="r-name"
              value={name}
              onChange={(e) =>
                setName(e.target.value.slice(0, RESTAURANT_NAME_MAX_LENGTH))
              }
              maxLength={RESTAURANT_NAME_MAX_LENGTH}
              required
            />
            <p className="text-right text-xs text-muted-foreground">
              {name.length}/{RESTAURANT_NAME_MAX_LENGTH}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-legal">Legal name</Label>
            <Input
              id="r-legal"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-currency">Currency</Label>
              <Input
                id="r-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-timezone">Timezone</Label>
              <Input
                id="r-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground">
              Loyalty program
            </h3>
            <p className="text-xs text-muted-foreground">
              How customers earn and redeem points at checkout.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-loyalty-earn">Earn 1 point per</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {currency}
                </span>
                <Input
                  id="r-loyalty-earn"
                  type="number"
                  min="1"
                  step="1"
                  value={loyaltyEarnPerCurrency}
                  onChange={(e) => setLoyaltyEarnPerCurrency(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-loyalty-value">1 point redeems for</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {currency}
                </span>
                <Input
                  id="r-loyalty-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={loyaltyPointValue}
                  onChange={(e) => setLoyaltyPointValue(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-upi">UPI id (for QR payments)</Label>
              <Input
                id="r-upi"
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                placeholder="yourshop@okbank"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Shown as a scannable QR at checkout and on the customer display,
                with the exact bill amount filled in.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-upi-name">UPI payee name</Label>
              <Input
                id="r-upi-name"
                value={upiPayeeName}
                onChange={(e) => setUpiPayeeName(e.target.value)}
                placeholder={name}
                maxLength={60}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={updateRestaurant.isPending}
            className="self-start"
          >
            {updateRestaurant.isPending ? "Saving…" : "Save restaurant"}
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-[18px] font-medium text-foreground">This branch</h2>
        <form onSubmit={onSubmitBranch} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="b-name">Branch name</Label>
            <Input
              id="b-name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="b-address">Address</Label>
            <Input
              id="b-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-phone">Phone</Label>
              <Input
                id="b-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-gst">GST number (legacy)</Label>
              <Input
                id="b-gst"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground">Tax</h3>
            <p className="text-xs text-muted-foreground">
              Picks how menu prices and receipts handle tax for this branch.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-tax-regime">Region / regime</Label>
              <Select value={taxRegime} onValueChange={onRegimeChange}>
                <SelectTrigger id="b-tax-regime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_REGIMES.map((regime) => (
                    <SelectItem key={regime} value={regime}>
                      {TAX_REGIME_PRESETS[regime].displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-tax-mode">Menu prices are</Label>
              <Select
                value={taxMode}
                onValueChange={(v) => setTaxMode(v as TaxMode)}
              >
                <SelectTrigger id="b-tax-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCLUSIVE">Tax-inclusive</SelectItem>
                  <SelectItem value="EXCLUSIVE">
                    Tax-exclusive (tax added at checkout)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {preset.exampleRates} — set the exact rate per menu item under Menu.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-country">Country code</Label>
              <Input
                id="b-country"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                maxLength={2}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-tax-id">
                {TAX_REGIME_PRESETS[taxRegime].taxIdLabel}
              </Label>
              <Input
                id="b-tax-id"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="b-tax-label">
              Receipt label override (optional)
            </Label>
            <Input
              id="b-tax-label"
              value={taxLabel}
              onChange={(e) => setTaxLabel(e.target.value)}
              placeholder={preset.taxLabel}
            />
          </div>

          <Button
            type="submit"
            disabled={updateBranch.isPending}
            className="self-start"
          >
            {updateBranch.isPending ? "Saving…" : "Save branch"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

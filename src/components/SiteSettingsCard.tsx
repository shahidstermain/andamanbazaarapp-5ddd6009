import { useEffect, useState } from "react";
import { Bell, Loader2, Save, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { updateSiteSettings, fetchAdminSiteSettings } from "@/lib/siteSettings";

const CONVERSION_ACTIONS: { key: string; label: string; hint: string }[] = [
  { key: "signup", label: "Signup", hint: "Email signup completes (Google OAuth excluded)." },
  { key: "listing_posted", label: "Listing posted", hint: "Seller publishes a new listing." },
  { key: "lead_submitted", label: "Lead submitted", hint: "Message seller, booking lead, trip-planner lead." },
  { key: "trip_paid", label: "Trip plan paid", hint: "Cashfree confirms trip-plan payment." },
  { key: "boost_paid", label: "Boost paid", hint: "Cashfree confirms boost payment." },
  { key: "booking_paid", label: "Booking paid", hint: "Future: paid booking checkout." },
];

const SLOT_KEYS: { key: string; label: string; hint: string }[] = [
  { key: "blog_in_article", label: "Blog — in-article", hint: "Shows beneath the blog post body." },
  { key: "blog_index_grid", label: "Blog — index grid", hint: "Shows beneath the blog post grid." },
  { key: "listings_grid", label: "Listings — grid", hint: "Shows beneath the marketplace results grid." },
];

const AW_REGEX = /^AW-\d{8,12}$/;
const PUB_REGEX = /^ca-pub-\d{16}$/;
const LABEL_REGEX = /^[A-Za-z0-9_-]{6,60}$/;
const SLOT_ID_REGEX = /^\d{6,16}$/;

export function SiteSettingsCard() {
  const { user } = useAuth();
  const { settings, refresh } = useSiteMeta();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [title, setTitle] = useState(settings.site_title);
  const [description, setDescription] = useState(settings.site_description);
  const [saving, setSaving] = useState(false);

  // Visitor alerts state
  const [alertsEnabled, setAlertsEnabled] = useState(settings.visitor_alerts_enabled);
  const [inAppEnabled, setInAppEnabled] = useState(settings.visitor_alerts_in_app);
  const [emailEnabled, setEmailEnabled] = useState(settings.visitor_alerts_email_enabled);
  const [alertEmail, setAlertEmail] = useState(settings.visitor_alert_email ?? "");
  const [webhookEnabled, setWebhookEnabled] = useState(settings.visitor_alerts_webhook_enabled);
  const [webhookUrl, setWebhookUrl] = useState(settings.visitor_alert_webhook_url ?? "");
  const [savingAlerts, setSavingAlerts] = useState(false);

  // Google Ads + AdSense state
  const [conversionId, setConversionId] = useState(settings.google_ads_conversion_id ?? "");
  const [labels, setLabels] = useState<Record<string, string>>(settings.google_ads_conversion_labels ?? {});
  const [publisherId, setPublisherId] = useState(settings.adsense_publisher_id ?? "");
  const [adsEnabled, setAdsEnabled] = useState(settings.adsense_enabled);
  const [slotIds, setSlotIds] = useState<Record<string, string>>(settings.adsense_slot_ids ?? {});
  const [savingAds, setSavingAds] = useState(false);

  useEffect(() => {
    setTitle(settings.site_title);
    setDescription(settings.site_description);
    setAlertsEnabled(settings.visitor_alerts_enabled);
    setInAppEnabled(settings.visitor_alerts_in_app);
    setEmailEnabled(settings.visitor_alerts_email_enabled);
    setAlertEmail(settings.visitor_alert_email ?? "");
    setWebhookEnabled(settings.visitor_alerts_webhook_enabled);
    setWebhookUrl(settings.visitor_alert_webhook_url ?? "");
    setConversionId(settings.google_ads_conversion_id ?? "");
    setLabels(settings.google_ads_conversion_labels ?? {});
    setPublisherId(settings.adsense_publisher_id ?? "");
    setAdsEnabled(settings.adsense_enabled);
    setSlotIds(settings.adsense_slot_ids ?? {});
  }, [settings]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        if (active) setIsAdmin(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [user]);

  // When admin, load the full settings (including alert config) directly from the table.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    fetchAdminSiteSettings().then((s) => {
      if (!active) return;
      setAlertsEnabled(s.visitor_alerts_enabled);
      setInAppEnabled(s.visitor_alerts_in_app);
      setEmailEnabled(s.visitor_alerts_email_enabled);
      setAlertEmail(s.visitor_alert_email ?? "");
      setWebhookEnabled(s.visitor_alerts_webhook_enabled);
      setWebhookUrl(s.visitor_alert_webhook_url ?? "");
      setConversionId(s.google_ads_conversion_id ?? "");
      setLabels(s.google_ads_conversion_labels ?? {});
      setPublisherId(s.adsense_publisher_id ?? "");
      setAdsEnabled(s.adsense_enabled);
      setSlotIds(s.adsense_slot_ids ?? {});
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (isAdmin === null) return null;
  if (!isAdmin) return null;

  const onSave = async () => {
    const t = title.trim();
    const d = description.trim();
    if (t.length < 3) {
      toast({ title: "Title too short", variant: "destructive" });
      return;
    }
    if (d.length < 10) {
      toast({ title: "Description too short", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateSiteSettings({ site_title: t, site_description: d }, user?.id);
      await refresh();
      toast({ title: "Site settings saved" });
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSaveAlerts = async () => {
    const email = alertEmail.trim();
    const hook = webhookUrl.trim();
    if (emailEnabled && !/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Enter a valid alert email", variant: "destructive" });
      return;
    }
    if (webhookEnabled) {
      try {
        const u = new URL(hook);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad protocol");
      } catch {
        toast({ title: "Enter a valid webhook URL", variant: "destructive" });
        return;
      }
    }
    setSavingAlerts(true);
    try {
      await updateSiteSettings(
        {
          visitor_alerts_enabled: alertsEnabled,
          visitor_alerts_in_app: inAppEnabled,
          visitor_alerts_email_enabled: emailEnabled,
          visitor_alert_email: email || null,
          visitor_alerts_webhook_enabled: webhookEnabled,
          visitor_alert_webhook_url: hook || null,
        },
        user?.id,
      );
      await refresh();
      toast({ title: "Visitor alerts saved" });
    } catch (e) {
      toast({
        title: "Could not save alerts",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSavingAlerts(false);
    }
  };

  const onSaveAds = async () => {
    const id = conversionId.trim();
    const pub = publisherId.trim();
    if (id && !AW_REGEX.test(id)) {
      toast({ title: "Invalid Conversion ID", description: "Expected format AW-XXXXXXXXXX.", variant: "destructive" });
      return;
    }
    if (pub && !PUB_REGEX.test(pub)) {
      toast({ title: "Invalid AdSense Publisher ID", description: "Expected format ca-pub-XXXXXXXXXXXXXXXX.", variant: "destructive" });
      return;
    }
    // Validate and prune labels — keep only non-empty, valid label strings.
    const cleanedLabels: Record<string, string> = {};
    for (const { key } of CONVERSION_ACTIONS) {
      const v = (labels[key] ?? "").trim();
      if (!v) continue;
      if (!LABEL_REGEX.test(v)) {
        toast({
          title: `Invalid label for "${key}"`,
          description: "Labels are 6–60 characters, letters/digits/_-.",
          variant: "destructive",
        });
        return;
      }
      cleanedLabels[key] = v;
    }
    const cleanedSlots: Record<string, string> = {};
    for (const { key } of SLOT_KEYS) {
      const v = (slotIds[key] ?? "").trim();
      if (!v) continue;
      if (!SLOT_ID_REGEX.test(v)) {
        toast({
          title: `Invalid slot ID for "${key}"`,
          description: "AdSense slot IDs are numeric (6–16 digits).",
          variant: "destructive",
        });
        return;
      }
      cleanedSlots[key] = v;
    }
    setSavingAds(true);
    try {
      await updateSiteSettings(
        {
          google_ads_conversion_id: id || null,
          google_ads_conversion_labels: cleanedLabels,
          adsense_publisher_id: pub || null,
          adsense_enabled: adsEnabled && !!pub,
          adsense_slot_ids: cleanedSlots,
        },
        user?.id,
      );
      await refresh();
      toast({ title: "Ad settings saved" });
    } catch (e) {
      toast({
        title: "Could not save ad settings",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSavingAds(false);
    }
  };

  return (
    <>
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4">
        <h2 className="text-base font-semibold">Site title & description</h2>
        <p className="text-sm text-muted-foreground">
          Used for the browser tab, search results, and social previews. Updates everywhere instantly.
        </p>
      </header>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="site-title">Site title</Label>
          <Input
            id="site-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{title.length}/120 · keep under ~60 for SEO</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="site-description">Site description</Label>
          <Textarea
            id="site-description"
            value={description}
            maxLength={300}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {description.length}/300 · keep under ~160 for SEO
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </section>

    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Visitor alerts</h2>
          <p className="text-sm text-muted-foreground">
            Get notified when a new visitor session starts. Choose any combination of channels.
          </p>
        </div>
      </header>

      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
          <div>
            <Label className="text-sm font-medium">Enable visitor alerts</Label>
            <p className="text-xs text-muted-foreground">Master switch for all channels below.</p>
          </div>
          <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
        </div>

        <div className={alertsEnabled ? "space-y-4" : "space-y-4 opacity-50 pointer-events-none"}>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">In-app notification</Label>
              <p className="text-xs text-muted-foreground">Show in admin notification bell.</p>
            </div>
            <Switch checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email alerts</Label>
                <p className="text-xs text-muted-foreground">Send to a single recipient.</p>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>
            <Input
              type="email"
              placeholder="alerts@yourdomain.com"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              disabled={!emailEnabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Webhook</Label>
                <p className="text-xs text-muted-foreground">POST JSON to a URL (Slack, Discord, Zapier…).</p>
              </div>
              <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
            </div>
            <Input
              type="url"
              placeholder="https://hooks.example.com/visitor"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={!webhookEnabled}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSaveAlerts} disabled={savingAlerts}>
            {savingAlerts ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save alerts
          </Button>
        </div>
      </div>
    </section>

    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Megaphone className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Google Ads &amp; AdSense</h2>
          <p className="text-sm text-muted-foreground">
            Paste your IDs from Google Ads and AdSense. The site picks them up live — no redeploy. Admin and checkout pages are never targeted.
          </p>
        </div>
      </header>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ads-conversion-id">Google Ads Conversion ID</Label>
          <Input
            id="ads-conversion-id"
            placeholder="AW-1234567890"
            value={conversionId}
            onChange={(e) => setConversionId(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Google Ads → Tools → Conversions → choose an action → "Use Google tag" — copy the value that starts with <code>AW-</code>.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-4">
          <p className="mb-3 text-sm font-medium">Conversion labels</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Create one conversion action per row in Google Ads, then paste its label (the short string after the slash in <code>send_to</code>).
            Leave any row blank to skip that event.
          </p>
          <div className="space-y-3">
            {CONVERSION_ACTIONS.map((a) => (
              <div key={a.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[12rem,1fr]">
                <div className="pt-1.5">
                  <Label className="text-sm font-medium">{a.label}</Label>
                  <p className="text-xs text-muted-foreground">{a.hint}</p>
                </div>
                <Input
                  placeholder="abcDEF123…"
                  value={labels[a.key] ?? ""}
                  onChange={(e) =>
                    setLabels((m) => ({ ...m, [a.key]: e.target.value }))
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adsense-publisher">AdSense Publisher ID</Label>
          <Input
            id="adsense-publisher"
            placeholder="ca-pub-1234567890123456"
            value={publisherId}
            onChange={(e) => setPublisherId(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            AdSense → Account → Settings → Account information. Save it once your site is approved.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
          <div>
            <Label className="text-sm font-medium">Show AdSense slots</Label>
            <p className="text-xs text-muted-foreground">Kill switch — turn off to instantly remove all ad units.</p>
          </div>
          <Switch checked={adsEnabled} onCheckedChange={setAdsEnabled} disabled={!publisherId.trim()} />
        </div>

        <div className={adsEnabled ? "rounded-xl border border-border bg-background/40 p-4" : "rounded-xl border border-border bg-background/40 p-4 opacity-50 pointer-events-none"}>
          <p className="mb-3 text-sm font-medium">AdSense slot IDs</p>
          <p className="mb-4 text-xs text-muted-foreground">
            In AdSense, create a display ad unit for each placement and paste its numeric slot ID here. Empty rows render nothing.
          </p>
          <div className="space-y-3">
            {SLOT_KEYS.map((s) => (
              <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[14rem,1fr]">
                <div className="pt-1.5">
                  <Label className="text-sm font-medium">{s.label}</Label>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
                <Input
                  placeholder="1234567890"
                  value={slotIds[s.key] ?? ""}
                  onChange={(e) =>
                    setSlotIds((m) => ({ ...m, [s.key]: e.target.value }))
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSaveAds} disabled={savingAds}>
            {savingAds ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save ad settings
          </Button>
        </div>
      </div>
    </section>
    </>
  );
}

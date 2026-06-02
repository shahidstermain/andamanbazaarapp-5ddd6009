import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import {
  type ConversionAction,
  readConversionLog,
  trackConversion,
  isValidConversionId,
  isValidPublisherId,
} from "@/lib/gtag";

const ACTIONS: ConversionAction[] = [
  "signup",
  "listing_posted",
  "lead_submitted",
  "trip_paid",
  "booking_paid",
  "boost_paid",
];

/**
 * Admin-only diagnostics for the gtag + AdSense integration. Lets an admin
 * confirm the Google scripts loaded, see recently-fired conversions, and
 * send a test event without leaving the dashboard.
 */
export function AdsDiagnostics() {
  const { settings } = useSiteMeta();
  const [gtagLoaded, setGtagLoaded] = useState(false);
  const [adsenseLoaded, setAdsenseLoaded] = useState(false);
  const [log, setLog] = useState(readConversionLog());
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setGtagLoaded(typeof window.gtag === "function");
      setAdsenseLoaded(Array.isArray(window.adsbygoogle));
      setLog(readConversionLog());
    }, 1000);
    return () => window.clearInterval(id);
  }, [pulse]);

  const conversionId = settings.google_ads_conversion_id;
  const publisherId = settings.adsense_publisher_id;

  const idOk = isValidConversionId(conversionId);
  const pubOk = isValidPublisherId(publisherId);

  const fire = (action: ConversionAction) => {
    trackConversion(action, { value: 1, currency: "INR", transaction_id: `test-${Date.now()}` });
    setPulse((n) => n + 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Ads diagnostics
        </CardTitle>
        <CardDescription>
          Verify gtag and AdSense are wired up. Tests run in your browser only and never reach a real campaign — Google's debugger shows them as test conversions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusRow
            label="Google Ads Conversion ID"
            ok={idOk}
            value={idOk ? conversionId! : conversionId ? "Invalid format" : "Not set"}
          />
          <StatusRow
            label="gtag.js loaded"
            ok={gtagLoaded}
            value={gtagLoaded ? "window.gtag present" : "Not loaded (production only)"}
          />
          <StatusRow
            label="AdSense Publisher ID"
            ok={pubOk}
            value={pubOk ? publisherId! : publisherId ? "Invalid format" : "Not set"}
          />
          <StatusRow
            label="AdSense script loaded"
            ok={adsenseLoaded}
            value={adsenseLoaded ? "window.adsbygoogle present" : "Not loaded"}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Send a test conversion</p>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <Button key={a} size="sm" variant="outline" onClick={() => fire(a)}>
                {a}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tests no-op in dev. In production they only fire if the label for that action is configured.
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Recent events (this session, last 10)</p>
          {log.length === 0 ? (
            <p className="text-xs text-muted-foreground">No conversions fired yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-background/40 text-xs">
              {log.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {e.sent ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="font-mono">{e.action}</span>
                    {e.reason ? <span className="text-muted-foreground">— {e.reason}</span> : null}
                  </div>
                  <time className="tabular-nums text-muted-foreground">
                    {new Date(e.at).toLocaleTimeString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-medium">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="break-all">{value}</span>
      </p>
    </div>
  );
}

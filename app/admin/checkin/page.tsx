"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, Camera, CameraOff, Loader2 } from "lucide-react";

type Result = {
  result: "ok" | "valid" | "already_used" | "forged" | "not_found" | "not_paid" | "error" | "forbidden" | "invalid";
  message: string;
  buyer?: string;
  tier?: string | null;
  event?: string | null;
  ticketNumber?: string;
  checkedInAt?: string;
  checkedIn?: number;
  totalPaid?: number;
};

const STYLE: Record<string, { box: string; icon: any }> = {
  ok: { box: "bg-emerald-600 text-white", icon: CheckCircle2 },
  valid: { box: "bg-emerald-600 text-white", icon: CheckCircle2 },
  already_used: { box: "bg-amber-500 text-black", icon: AlertTriangle },
  forged: { box: "bg-red-600 text-white", icon: XCircle },
  not_found: { box: "bg-red-600 text-white", icon: XCircle },
  not_paid: { box: "bg-red-600 text-white", icon: XCircle },
  error: { box: "bg-red-600 text-white", icon: XCircle },
  forbidden: { box: "bg-red-600 text-white", icon: XCircle },
  invalid: { box: "bg-red-600 text-white", icon: XCircle },
};

export default function GateCheckinPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async (value: string, mode: "checkin" | "lookup" = "checkin") => {
    const v = value.trim();
    if (!v) return;
    setBusy(true);
    try {
      const r = await fetch("/api/tickets/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: v, mode }) });
      const data = await r.json().catch(() => ({ result: "error", message: "Unexpected response from the server." }));
      setRes(data);
      if (navigator.vibrate) navigator.vibrate(data.result === "ok" ? 80 : [120, 80, 120]);
    } catch {
      setRes({ result: "error", message: "Couldn't reach the server. Check the connection and scan again." });
    }
    setBusy(false);
    setCode("");
    inputRef.current?.focus();
  }, []);

  // Camera scanning via the browser's built-in QR detector (Chrome / Android). Manual entry and
  // USB / Bluetooth barcode scanners (which "type" the code) work everywhere.
  useEffect(() => {
    if (!camOn) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        const Detector = (window as any).BarcodeDetector;
        if (!Detector) { setCamError("This browser can't scan QR codes with the camera. Use Chrome on Android, or type the ticket number / use a handheld scanner."); setCamOn(false); return; }
        const detector = new Detector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const loop = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            const value = found?.[0]?.rawValue as string | undefined;
            if (value) {
              const now = Date.now();
              if (value !== lastScan.current.code || now - lastScan.current.at > 4000) {
                lastScan.current = { code: value, at: now };
                await submit(value);
              }
            }
          } catch {}
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        setCamError("Couldn't open the camera. Allow camera access for this site and try again.");
        setCamOn(false);
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camOn, submit]);

  const style = res ? STYLE[res.result] || STYLE.error : null;
  const Icon = style?.icon;

  return (
    <div className="p-6 sm:p-10 max-w-xl">
      <h1 className="heading-display text-3xl mb-1 flex items-center gap-2"><ScanLine className="size-7 text-gold-deep" /> Gate Check-in</h1>
      <p className="text-sm text-ink/55 mb-6">Scan each gate-pass QR. A ticket works once — copies and screenshots of a used pass are refused.</p>

      <div className="card-elegant p-5 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Scan or type ticket number"
            autoCapitalize="characters"
            className="flex-1 rounded-lg border border-black/10 px-3 py-3 text-sm font-mono uppercase"
          />
          <button type="submit" disabled={busy || !code.trim()} className="btn-gold !px-5 disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : "Check in"}</button>
        </form>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setCamError(null); setCamOn((v) => !v); }} className="text-xs px-3 py-2 rounded-full border border-black/15 hover:bg-black/[0.03] flex items-center gap-1.5">
            {camOn ? <CameraOff className="size-3.5" /> : <Camera className="size-3.5" />} {camOn ? "Stop camera" : "Scan with camera"}
          </button>
          <button type="button" onClick={() => submit(code, "lookup")} disabled={busy || !code.trim()} className="text-xs text-ink/50 underline disabled:opacity-40">Look up only (don&apos;t check in)</button>
        </div>
        {camError && <p className="text-xs text-red-600">{camError}</p>}
        {camOn && <video ref={videoRef} playsInline muted className="w-full rounded-lg bg-black aspect-video object-cover" />}
      </div>

      {res && style && Icon && (
        <div className={`mt-5 rounded-xl2 p-6 ${style.box}`} role="status" aria-live="assertive">
          <div className="flex items-center gap-3">
            <Icon className="size-10 shrink-0" />
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-tight">{res.message}</p>
              {res.buyer && <p className="text-lg mt-1 break-words">{res.buyer}{res.tier ? ` · ${res.tier}` : ""}</p>}
            </div>
          </div>
          <div className="mt-3 text-sm opacity-90 space-y-0.5">
            {res.event && <p>{res.event}</p>}
            {res.ticketNumber && <p className="font-mono">{res.ticketNumber}</p>}
            {res.result === "already_used" && res.checkedInAt && <p>First scanned {new Date(res.checkedInAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}</p>}
            {res.result === "ok" && res.totalPaid != null && <p>{res.checkedIn} of {res.totalPaid} checked in</p>}
          </div>
        </div>
      )}
    </div>
  );
}

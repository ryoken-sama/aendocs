import aenLogo from "../../assets/aen-logo.png";

export type SplashPhase = "connecting" | "verifying" | "loading-data" | "almost-ready";

const PHASE_TEXT: Record<SplashPhase, string> = {
  connecting: "Connecting to aenapply.com…",
  verifying: "Verifying session…",
  "loading-data": "Loading dashboard data…",
  "almost-ready": "Almost ready…",
};

// A real (not indeterminate) percentage tied to actual phase transitions —
// see SplashGate for what triggers each one.
const PHASE_PROGRESS: Record<SplashPhase, number> = {
  connecting: 15,
  verifying: 40,
  "loading-data": 70,
  "almost-ready": 100,
};

interface SplashScreenProps {
  fadingOut: boolean;
  phase: SplashPhase;
}

/** Full-screen branded overlay shown while the app initializes — see
 * SplashGate for the timing/dismissal/phase logic. Hardcodes the dark
 * background (#111117) and white text regardless of the user's saved
 * theme, since this is a fixed brand moment, not a themed screen. */
export function SplashScreen({ fadingOut, phase }: SplashScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#111117] transition-opacity duration-500 ease-out ${
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={fadingOut}
    >
      <img src={aenLogo} alt="AEN Document Manager" className="w-[200px]" />
      <p className="mt-5 font-sans text-base font-light text-white">AEN Document Manager</p>

      <div className="mt-8 w-56" role="status" aria-live="polite">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${PHASE_PROGRESS[phase]}%` }}
          />
        </div>
        <p className="mt-3 text-center text-xs text-white/60">{PHASE_TEXT[phase]}</p>
      </div>
    </div>
  );
}

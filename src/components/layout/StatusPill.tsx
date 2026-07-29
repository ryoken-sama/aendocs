import { useThemeContext } from "../../context/ThemeContext";

interface StatusPillProps {
  status: string;
}

type ColorFamily = "cyan" | "green" | "blue" | "red" | "amber" | "orange";

// Matches aenapply's own status colors. Keyed by keyword (checked
// case-insensitively via `.includes`, in this order — first match wins),
// not exact string, since real status text can carry extra context around
// the phrase.
const STATUS_FAMILIES: { keyword: string; family: ColorFamily }[] = [
  { keyword: "document submitted", family: "cyan" },
  { keyword: "in process", family: "green" },
  { keyword: "offer applied", family: "blue" },
  { keyword: "on hold (branch)", family: "red" },
  { keyword: "on hold (admission head)", family: "red" },
  { keyword: "no intake", family: "red" },
  { keyword: "declined", family: "red" },
  { keyword: "not eligible", family: "amber" },
  { keyword: "offer rejected", family: "red" },
  { keyword: "offer withdrawn", family: "red" },
  { keyword: "course not available", family: "red" },
  { keyword: "agent change application", family: "amber" },
  { keyword: "agent change not allowed", family: "amber" },
  { keyword: "incomplete documents", family: "orange" },
  { keyword: "visa granted", family: "green" },
  { keyword: "visa rejected", family: "red" },
  { keyword: "visa withdraw", family: "red" },
  { keyword: "visa applied", family: "blue" },
];

// Dark mode: brightened colors as text on a 15%-opacity tint of themselves —
// reads fine against the near-black background.
// Light mode: the same hues but darkened (per family), used as the text
// color for contrast against white, on a 12%-opacity background tint with a
// 40%-opacity border of the same darkened color — a plain 15%-opacity tint
// of the bright dark-mode color is too washed out to read against white.
//
// Written as complete literal class strings (not built from interpolated
// variables) so Tailwind's static content scanner can find them.
const FAMILY_STYLES: Record<ColorFamily, { dark: string; light: string }> = {
  cyan: {
    dark: "text-[#22D3EE] bg-[#22D3EE]/15",
    light: "text-[#0891B2] bg-[#0891B2]/12 border border-[#0891B2]/40",
  },
  green: {
    dark: "text-[#10B981] bg-[#10B981]/15",
    light: "text-[#059669] bg-[#059669]/12 border border-[#059669]/40",
  },
  blue: {
    dark: "text-[#60A5FA] bg-[#60A5FA]/15",
    light: "text-[#2563EB] bg-[#2563EB]/12 border border-[#2563EB]/40",
  },
  red: {
    dark: "text-[#F87171] bg-[#F87171]/15",
    light: "text-[#DC2626] bg-[#DC2626]/12 border border-[#DC2626]/40",
  },
  amber: {
    dark: "text-[#FBBF24] bg-[#FBBF24]/15",
    light: "text-[#D97706] bg-[#D97706]/12 border border-[#D97706]/40",
  },
  orange: {
    dark: "text-[#FB923C] bg-[#FB923C]/15",
    light: "text-[#EA580C] bg-[#EA580C]/12 border border-[#EA580C]/40",
  },
};

function pillColorClasses(status: string, darkMode: boolean): string {
  const s = status.toLowerCase();
  const match = STATUS_FAMILIES.find(({ keyword }) => s.includes(keyword));
  if (!match) return "bg-border text-muted";
  return darkMode ? FAMILY_STYLES[match.family].dark : FAMILY_STYLES[match.family].light;
}

export function StatusPill({ status }: StatusPillProps) {
  const { darkMode } = useThemeContext();
  if (!status) return null;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-3xl px-3 py-0.5 text-xs font-medium ${pillColorClasses(status, darkMode)}`}
    >
      {status}
    </span>
  );
}

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useThemeContext } from "../../context/ThemeContext";

interface HorizontalBarChartProps {
  data: { label: string; count: number }[];
  height?: number;
  /** Called with the clicked bar's index into `data` — the caller already
   * has its own richer version of that same array (with a section key or
   * country id attached) to look up by index, so this stays a generic,
   * data-shape-agnostic chart component. */
  onBarClick?: (index: number) => void;
}

/** Shared horizontal bar chart for the dashboard's "Applications by Status"
 * and "Applications by Country" panels — recharts needs literal color
 * values (not Tailwind classes) for its SVG props, so these are picked
 * from the same palette index.css defines for --color-muted/--color-border
 * in each theme, rather than trying to pass CSS variables into SVG
 * presentation attributes (unreliable cross-browser). */
export function HorizontalBarChart({ data, height = 260, onBarClick }: HorizontalBarChartProps) {
  const { darkMode } = useThemeContext();
  const axisColor = darkMode ? "#9ca3af" : "#6b7280";
  const gridColor = darkMode ? "#2e2e38" : "#ede8e6";
  const tooltipBg = darkMode ? "#1c1c23" : "#ffffff";
  const tooltipText = darkMode ? "#f3f3f5" : "#111117";

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} stroke={gridColor} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fill: axisColor, fontSize: 12 }}
            stroke={gridColor}
          />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${gridColor}`,
              borderRadius: 8,
              color: tooltipText,
              fontSize: 13,
            }}
            cursor={{ fill: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
          />
          <Bar
            dataKey="count"
            fill="#C61F65"
            radius={[0, 4, 4, 0]}
            barSize={16}
            cursor={onBarClick ? "pointer" : undefined}
            onClick={onBarClick ? (_, index) => onBarClick(index) : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

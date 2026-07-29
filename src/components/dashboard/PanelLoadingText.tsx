interface PanelLoadingTextProps {
  text: string;
  height?: number;
}

/** Replaces skeleton loaders across the dashboard's panels — just the
 * status text for whichever fetch that panel is waiting on, centered in
 * the same footprint the real content will occupy once it arrives. */
export function PanelLoadingText({ text, height = 260 }: PanelLoadingTextProps) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

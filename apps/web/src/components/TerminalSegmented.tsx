type Accent = "primary" | "lobster";

function activeClass(accent: Accent): string {
  if (accent === "lobster") return "bg-lobster/10 text-lobster border-lobster/40";
  return "bg-primary/10 text-primary border-primary/40";
}

export function TerminalSegmented<T extends string>(props: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
  accent?: Accent;
  className?: string;
}) {
  const accent = props.accent ?? "primary";
  return (
    <div className={`flex border border-border-terminal bg-surface-terminal p-0.5 rounded-sm ${props.className ?? ""}`.trim()}>
      {props.options.map((opt) => {
        const selected = opt.value === props.value;
        return (
          <button
            key={opt.value}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all border border-transparent ${
              selected ? activeClass(accent) : "text-text-dim hover:text-white"
            }`}
            onClick={() => props.onChange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

import { Icon } from "./Icon";

type Accent = "primary" | "lobster";

function focusBorder(accent: Accent): string {
  return accent === "lobster" ? "focus:border-lobster" : "focus:border-primary";
}

export function TerminalSearchInput(props: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  accent?: Accent;
  className?: string;
}) {
  const accent = props.accent ?? "primary";

  return (
    <div className={`relative w-full max-w-xs h-8 ${props.className ?? ""}`.trim()}>
      <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-text-dim">
        <Icon name="terminal" className="text-[16px]" />
      </span>
      <input
        className={`w-full h-full rounded bg-surface-terminal border border-border-terminal text-white placeholder-text-dim ${focusBorder(
          accent
        )} focus:ring-0 pl-8 pr-2 text-xs font-mono`}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

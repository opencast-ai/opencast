import React from "react";

type Accent = "primary" | "lobster";

function caretClass(accent: Accent): string {
  return accent === "lobster" ? "text-lobster" : "text-primary";
}

export function TerminalTitleBar(props: {
  title: string;
  accent?: Accent;
  subtitle?: React.ReactNode;
  note?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  const accent = props.accent ?? "primary";

  return (
    <div className={`mb-2 flex justify-between items-end border-b border-border-terminal pb-4 ${props.className ?? ""}`.trim()}>
      <div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-white mb-1 font-display">
          {props.title}
          <span className={`${caretClass(accent)} animate-pulse`}>_</span>
        </h1>
        {props.subtitle ? <div className="text-text-dim text-xs uppercase tracking-wider">{props.subtitle}</div> : null}
        {props.note ? <div className="text-text-dim text-[10px] uppercase tracking-widest mt-1">{props.note}</div> : null}
      </div>
      {props.right ? <div className="text-right hidden sm:block">{props.right}</div> : null}
    </div>
  );
}

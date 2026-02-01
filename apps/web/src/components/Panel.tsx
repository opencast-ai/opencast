import React from "react";

export function Panel(props: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded border border-border-terminal bg-bg-terminal ${props.className ?? ""}`}>
      {props.title || props.subtitle || props.right ? (
        <header className="px-4 py-3 border-b border-border-terminal bg-surface-terminal flex items-start justify-between gap-4">
          <div className="min-w-0">
            {props.title ? <div className="text-white font-bold text-sm font-mono uppercase tracking-wider">{props.title}</div> : null}
            {props.subtitle ? <div className="text-text-dim text-xs font-mono mt-1">{props.subtitle}</div> : null}
          </div>
          {props.right ? <div className="shrink-0">{props.right}</div> : null}
        </header>
      ) : null}
      <div className="p-4">{props.children}</div>
    </section>
  );
}

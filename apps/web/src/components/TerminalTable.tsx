import React from "react";

export function TerminalTable(props: {
  head: React.ReactNode;
  body: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border-terminal bg-bg-terminal ${props.className ?? ""}`.trim()}>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>{props.head}</thead>
          {props.body}
        </table>
      </div>
    </div>
  );
}

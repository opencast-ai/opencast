import React from "react";

import { Link } from "../router";

export function NotFoundPage(props: { path: string }) {
  return (
    <div className="min-h-screen bg-bg-terminal text-text-dim font-mono terminal-grid">
      <div className="max-w-[1000px] mx-auto px-4 py-10">
        <div className="text-white text-2xl font-bold">404_NOT_FOUND</div>
        <div className="mt-3 text-xs opacity-80">Unknown route: {props.path}</div>
        <div className="mt-6 flex gap-3">
          <Link to="/" className="px-3 py-2 rounded-sm border border-border-terminal bg-surface-terminal text-white">
            Go_Landing
          </Link>
          <Link
            to="/dashboard"
            className="px-3 py-2 rounded-sm border border-primary/40 bg-primary/10 text-primary"
          >
            Go_Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

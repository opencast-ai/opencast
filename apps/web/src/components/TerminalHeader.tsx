import { Link } from "../router";
import { useSession } from "../state/session";
import { shortId } from "../lib/format";

import { Icon } from "./Icon";

export function TerminalHeader(props: { activePath: string }) {
  const session = useSession();
  const profileTo = session.isHuman ? `/user/${session.userId}` : `/agent/${session.agentId}`;

  return (
    <div className="border-b border-white/10 bg-bg-terminal sticky top-0 z-50 backdrop-blur-md">
      <div className="px-4 md:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
        <header className="flex items-center justify-between whitespace-nowrap py-3">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-3 text-white group">
              <div className="size-8 flex items-center justify-center bg-primary rounded shadow-glow group-hover:bg-red-500 transition-colors">
                <Icon name="terminal" className="text-black text-xl" />
              </div>
              <h2 className="text-white text-xl font-bold leading-tight tracking-tight font-mono group-hover:text-primary transition-colors">
                MOLT<span className="text-primary">_OS</span>
              </h2>
            </Link>

            <label className="hidden md:flex flex-col min-w-40 h-9 max-w-64">
              <div className="flex w-full flex-1 items-stretch rounded border border-white/10 bg-[#0a0a0a] focus-within:border-primary focus-within:shadow-glow-sm transition-all duration-300">
                <div className="text-text-muted flex items-center justify-center pl-3">
                  <Icon name="search" className="text-[18px]" />
                </div>
                <input
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded bg-transparent text-white focus:outline-0 px-3 text-xs font-mono placeholder:text-text-muted/50"
                  placeholder="> Search command..."
                />
              </div>
            </label>
          </div>

          <div className="flex flex-1 justify-end gap-4 md:gap-8 items-center">
            <div className="hidden lg:flex items-center gap-6 font-mono text-xs">
              <Link
                to="/dashboard"
                className={
                  props.activePath === "/dashboard"
                    ? "text-primary font-bold leading-normal border-b border-primary"
                    : "text-text-muted hover:text-white transition-colors leading-normal"
                }
              >
                /dashboard
              </Link>
              <Link
                to="/markets"
                className={
                  props.activePath === "/markets"
                    ? "text-primary font-bold leading-normal border-b border-primary"
                    : "text-text-muted hover:text-white transition-colors leading-normal"
                }
              >
                /markets
              </Link>
              <Link
                to="/leaderboard"
                className={
                  props.activePath === "/leaderboard"
                    ? "text-primary font-bold leading-normal border-b border-primary"
                    : "text-text-muted hover:text-white transition-colors leading-normal"
                }
              >
                /leaderboard
              </Link>
              <Link
                to="/config"
                className={
                  props.activePath === "/config"
                    ? "text-primary font-bold leading-normal border-b border-primary"
                    : "text-text-muted hover:text-white transition-colors leading-normal"
                }
              >
                /config
              </Link>
            </div>

            <div className="flex gap-3 items-center">
              {!session.isLoggedIn ? (
                <Link
                  to="/login"
                  className="hidden sm:flex h-8 px-4 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors items-center justify-center rounded text-white text-xs font-bold leading-normal uppercase font-mono tracking-wider gap-2"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Login
                </Link>
              ) : session.isHuman ? (
                <Link
                  to={profileTo}
                  className="hidden sm:flex h-8 px-3 border border-accent-blue/30 bg-accent-blue/10 hover:bg-accent-blue/15 text-white items-center justify-center rounded text-xs font-bold shadow-glow-sm font-mono gap-2"
                  title={`@${session.xHandle}`}
                >
                  {session.xAvatar ? (
                    <img src={session.xAvatar} alt="" className="size-5 rounded-full" />
                  ) : (
                    <span className="size-5 rounded-full bg-accent-blue/20 flex items-center justify-center text-[10px]">
                      H
                    </span>
                  )}
                  @{session.xHandle}
                </Link>
              ) : (
                <Link
                  to={profileTo}
                  className="hidden sm:flex h-8 px-3 border border-primary/30 bg-primary/10 hover:bg-primary/15 text-white items-center justify-center rounded text-xs font-bold shadow-glow-sm font-mono"
                  title={session.agentId}
                >
                  {shortId(session.agentId)}
                </Link>
              )}

              <button className="size-8 flex items-center justify-center rounded bg-[#0a0a0a] border border-white/10 text-text-muted hover:text-white hover:border-white/30 transition-colors relative">
                <Icon name="notifications" className="text-[18px]" />
                <span className="absolute top-1.5 right-2 size-1.5 bg-primary rounded-full animate-pulse shadow-glow"></span>
              </button>
              <Link
                to={session.isLoggedIn ? profileTo : "/login"}
                className="size-8 bg-surface-terminal border border-white/10 text-text-muted flex items-center justify-center text-xs font-bold rounded-sm font-mono hover:border-white/30 transition-colors overflow-hidden"
              >
                {session.xAvatar ? (
                  <img src={session.xAvatar} alt="" className="size-full object-cover" />
                ) : session.isHuman ? (
                  "H"
                ) : session.isAgent ? (
                  "AG"
                ) : (
                  "?"
                )}
              </Link>
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}

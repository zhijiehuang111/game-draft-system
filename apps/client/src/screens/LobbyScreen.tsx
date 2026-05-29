import { logout as logoutApi } from "../api/auth.js";
import { AngledPanel } from "../components/AngledPanel.js";
import { Button } from "../components/Button.js";
import { CircleFrame } from "../components/CircleFrame.js";
import { Ornament } from "../components/Ornament.js";
import { disconnectSocket } from "../socket/setup.js";
import { useAppStore } from "../stores/index.js";

const PARTY_SIZE = 4;

export function LobbyScreen() {
  const user = useAppStore((s) => s.user);
  const queueSize = useAppStore((s) => s.queueSize);
  const inQueue = useAppStore((s) => s.inQueue);
  const socket = useAppStore((s) => s.socket);
  const socketConnected = useAppStore((s) => s.socketConnected);
  const setQueue = useAppStore((s) => s.setQueue);
  const logout = useAppStore((s) => s.logout);

  function handleJoin() {
    if (!socket) return;
    socket.emit("queue:join");
    setQueue({ size: queueSize, inQueue: true });
  }

  function handleLeave() {
    if (!socket) return;
    socket.emit("queue:leave");
    setQueue({ size: queueSize, inQueue: false });
  }

  async function handleLogout() {
    await logoutApi().catch(() => undefined);
    disconnectSocket();
    logout();
  }

  // visualised party slots — 1 for the user, others are matchmaking slots
  const filled = Math.max(1, Math.min(PARTY_SIZE, queueSize));
  const slots = Array.from({ length: PARTY_SIZE });

  return (
    <div className="min-h-screen flex flex-col">
      {/* faint banner imagery in the background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #0AC8B9 0%, transparent 35%), radial-gradient(circle at 80% 70%, #C8AA6E 0%, transparent 35%)",
          mixBlendMode: "screen",
        }}
      />

      {/* top bar */}
      <header className="relative flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rotate-45"
            style={{ background: socketConnected ? "#0AC8B9" : "#C8404B" }}
          />
          <span className="h-label">
            {socketConnected ? "Connected" : "Connecting…"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </header>

      {/* central banner */}
      <main className="relative flex-1 flex items-center justify-center px-6 pb-10">
        <div className="w-full max-w-md flex flex-col items-center gap-6 fade-up">
          {/* portrait crest */}
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-full opacity-50 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, #C8AA6E 0%, transparent 70%)",
              }}
            />
            <CircleFrame size={156} tone="gold" ring={3} glow>
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(circle at 50% 30%, #2A3658 0%, #0A1428 70%)",
                }}
              >
                <span
                  className="h-display text-[40px] text-gold-light"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {user?.username?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
            </CircleFrame>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Ornament width={260} />
            <div
              className="h-display text-[22px] mt-1"
              style={{ color: "#F0E6D2", letterSpacing: "0.35em" }}
            >
              {user?.username ?? "—"}
            </div>
            <Ornament width={260} flip />
          </div>

          {/* banner panel with party slots */}
          <AngledPanel
            variant="bronze"
            className="w-full"
            inner="linear-gradient(180deg, rgba(10, 20, 40,0.95) 0%, rgba(1, 10, 19,0.95) 100%)"
          >
            <div className="px-6 py-5 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 w-full">
                <span className="flex-1 h-px gold-divider-soft" />
                <span className="h-label tracking-[0.32em]">Party</span>
                <span className="flex-1 h-px gold-divider-soft" />
              </div>

              <div className="flex items-center gap-3">
                {slots.map((_, i) => {
                  const isFilled = i < filled;
                  return (
                    <div
                      key={i}
                      className="relative"
                      style={{
                        animation: `fade-up 0.4s ease-out ${i * 90}ms both`,
                      }}
                    >
                      <CircleFrame
                        size={34}
                        tone={isFilled ? "gold" : "dim"}
                        glow={isFilled}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            background: isFilled
                              ? "radial-gradient(circle, #2A3658, #0A1428)"
                              : "transparent",
                          }}
                        >
                          {isFilled && i === 0 && (
                            <svg width="14" height="14" viewBox="0 0 14 14">
                              <path
                                d="M2 11 L4 5 L7 8 L10 5 L12 11 Z"
                                fill="#C8AA6E"
                              />
                            </svg>
                          )}
                        </div>
                      </CircleFrame>
                    </div>
                  );
                })}
              </div>

              <div className="text-center">
                <div className="numeric text-[11px] text-stone tracking-[0.22em]">
                  In Queue {queueSize} / {PARTY_SIZE}
                </div>
              </div>
            </div>
          </AngledPanel>

          {/* CTA */}
          <div className="w-full flex justify-center pt-2">
            {inQueue ? (
              <Button
                variant="danger"
                size="xl"
                onClick={handleLeave}
                className="w-full max-w-xs"
              >
                Cancel Search
              </Button>
            ) : (
              <Button
                variant="primary"
                size="xl"
                onClick={handleJoin}
                disabled={!socketConnected}
                className="w-full max-w-xs lol-pulse"
              >
                Find Match
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

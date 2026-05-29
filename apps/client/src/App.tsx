import { useEffect } from "react";
import { getMe } from "./api/auth.js";
import { fetchChampions } from "./api/champions.js";
import { ApiRequestError } from "./api/http.js";
import { useToast } from "./components/Toast.js";
import { AuthScreen } from "./screens/AuthScreen.js";
import { LobbyScreen } from "./screens/LobbyScreen.js";
import { ResultScreen } from "./screens/ResultScreen.js";
import { RoomScreen } from "./screens/RoomScreen.js";
import { connectSocket } from "./socket/setup.js";
import { useAppStore } from "./stores/index.js";

function App() {
  const status = useAppStore((s) => s.authStatus);
  const user = useAppStore((s) => s.user);
  const currentRoom = useAppStore((s) => s.currentRoom);
  const draftResult = useAppStore((s) => s.draftResult);
  const setUser = useAppStore((s) => s.setUser);
  const setChampions = useAppStore((s) => s.setChampions);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then(({ user }) => {
        if (cancelled) return;
        setUser(user);
      })
      .catch((err) => {
        if (cancelled) return;
        setUser(null);
        if (!(err instanceof ApiRequestError && err.status === 401)) {
          console.error("getMe failed", err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  useEffect(() => {
    if (!user) return;

    connectSocket();
    let cancelled = false;
    fetchChampions()
      .then((list) => {
        if (cancelled) return;
        setChampions(list);
      })
      .catch((err) => {
        console.error("fetchChampions failed", err);
        toast.show("Failed to load champions", "error");
      });

    return () => {
      cancelled = true;
    };
  }, [user, setChampions, toast]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (draftResult) return <ResultScreen />;
  if (currentRoom && currentRoom.phase !== "aborted") return <RoomScreen />;
  return <LobbyScreen />;
}

export default App;

import { useEffect, useState } from "react";

import { getSession, subscribeSession, type Session } from "@/lib/session";

/** Reads the prototype session after hydration so SSR markup stays stable. */
export function useSession(): Session | null {
  const [session, setLocal] = useState<Session | null>(null);

  useEffect(() => {
    const sync = () => setLocal(getSession());
    sync();
    return subscribeSession(sync);
  }, []);

  return session;
}

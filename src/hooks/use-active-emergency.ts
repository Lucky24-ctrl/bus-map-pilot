import { useEffect, useState } from "react";

import type { EmergencyRequest } from "@/lib/emergency";
import { readEmergency, subscribeEmergency, writeEmergency } from "@/lib/emergency-store";

/** Active emergency request shared between the passenger map and admin view. */
export function useActiveEmergency(): [
  EmergencyRequest | null,
  (request: EmergencyRequest | null) => void,
] {
  const [request, setRequest] = useState<EmergencyRequest | null>(null);

  useEffect(() => {
    setRequest(readEmergency());
    return subscribeEmergency(() => setRequest(readEmergency()));
  }, []);

  return [request, writeEmergency];
}

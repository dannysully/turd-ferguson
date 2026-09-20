"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresh a reading that is still running.
 *
 * The page itself is server-rendered - the reading is read on the server and
 * arrives in the HTML - so this does not fetch anything or hold a copy of the
 * state. It asks Next to re-render the same route every few seconds while the
 * pass is in flight, and the server decides what changed.
 *
 * That is deliberately the smallest possible client component: a reading is a
 * page somebody opens once, reads, and sends to a client, and it must be
 * complete in the markup for anyone who never runs the script. A poll that
 * assembled the page in the browser would fail that.
 *
 * Nothing renders. It stops mounting once the pass is not running, so there is
 * no interval left behind on a finished reading.
 */
export default function ReadingPoll({ everyMs = 5000 }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);

  return null;
}

import { EventItem } from '../types';

/**
 * Cleanly and robustly retrieves live upcoming combat sports events from our server.
 * Our server leverages Gemini with Google Search Grounding to guarantee fresh,
 * active real-world schedules, with structured curated fallbacks.
 */
export async function crawlLiveEvents(): Promise<EventItem[]> {
  try {
    const response = await fetch('/api/events');
    if (!response.ok) {
      throw new Error(`FIGHT ZONE SERVER returned HTTP status ${response.status}`);
    }
    const data: EventItem[] = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid events response format from server");
    }
    return data;
  } catch (err: any) {
    console.warn("FIGHT ZONE CORE: Live event crawler offline bypass executed.");
    throw new Error("Could not load events - deploying offline mode.");
  }
}

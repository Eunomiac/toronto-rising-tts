export type PublicPlayerPin = {
  charKey: 'fomorach' | 'rashid' | 'lordLucien' | 'aishe' | 'blackCaesar';
  siteKey: string;
  visible: boolean;
};

export type PublicPlayerPinsSnapshot = {
  schemaVersion: 1;
  sessionCode: string;
  updatedAt: string;
  live: boolean;
  pins: PublicPlayerPin[];
};

export const PLAYER_PIN_ART: Record<PublicPlayerPin['charKey'], string> = {
  fomorach: '/assets/images/playerPins/playerPin_fomorach.webp',
  rashid: '/assets/images/playerPins/playerPin_rashid.webp',
  lordLucien: '/assets/images/playerPins/playerPin_lordLucien.webp',
  aishe: '/assets/images/playerPins/playerPin_aishe.webp',
  blackCaesar: '/assets/images/playerPins/playerPin_blackCaesar.webp',
};

export function sessionCodeFromUrl(search: string): string | null {
  const value = new URLSearchParams(search).get('session');
  if (!value || !/^[A-Za-z0-9_-]{6,64}$/.test(value)) return null;
  return value;
}

export async function fetchSessionPins(
  sessionCode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicPlayerPinsSnapshot | null> {
  const response = await fetchImpl(`/api/session/${encodeURIComponent(sessionCode)}/pins`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load session pins (${response.status})`);
  return response.json() as Promise<PublicPlayerPinsSnapshot>;
}

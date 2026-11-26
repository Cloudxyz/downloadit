export function videoId(value: unknown): value is string {
  return typeof value === 'string' && value.length === 11 && /^[A-Za-z0-9_-]+$/.test(value);
}

export function fromUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\s\u0000-\u001f]/u.test(value)) return;
  let url: URL;
  try { url = new URL(value); } catch { return; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return;
  let id: string | null | undefined;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  else if (['www.youtube.com','youtube.com','music.youtube.com','m.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) id = url.searchParams.get('v');
    else id = /^\/shorts\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
  }
  return videoId(id) ? id : undefined;
}

export const audioRates = [128, 192, 320] as const;
export const videoHeights = [480, 720, 1080] as const;
export type Format = 'mp3' | 'mp4';
export function quality(format: unknown, value: unknown): boolean {
  return typeof value === 'number' && (format === 'mp3' ? audioRates.some(n => n === value) :
    format === 'mp4' && videoHeights.some(n => n === value));
}

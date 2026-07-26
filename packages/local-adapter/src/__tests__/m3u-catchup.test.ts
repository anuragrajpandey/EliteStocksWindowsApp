import { describe, it, expect } from 'vitest';
import { parseM3U } from '../m3u-parser';
import { buildM3uCatchupUrl } from '../m3u-catchup';

describe('M3U Catchup', () => {
  it('should parse catchup, catchup-days, and catchup-source from EXTINF', () => {
    const m3uContent = `#EXTM3U
#EXTINF:-1 group-title="Tokyo | SG 01" tvg-id="gd05" tvg-logo="https://example.com/icon.png" catchup="default" catchup-days="6" catchup-source="https://akariko-bck1.sankuria.sbs/stream/jp/fuji_tv/replay.m3u8?start={utc}",Fuji TV
https://akariko-bck1.sankuria.sbs/stream/jp/fuji_tv/stream-output.m3u8?mode=hls
`;

    const result = parseM3U(m3uContent, 'source_1');
    expect(result.channels.length).toBe(1);
    const channel = result.channels[0];

    expect(channel.name).toBe('Fuji TV');
    expect(channel.tv_archive).toBe(1);
    expect(channel.catchup_type).toBe('default');
    expect(channel.catchup_days).toBe(6);
    expect(channel.catchup_source).toBe('https://akariko-bck1.sankuria.sbs/stream/jp/fuji_tv/replay.m3u8?start={utc}');
  });

  it('should resolve catchup-source template with {utc} placeholder', () => {
    const startTimeMs = 1750000000000; // 1750000000 seconds
    const url = buildM3uCatchupUrl({
      catchupSource: 'https://akariko-bck1.sankuria.sbs/stream/jp/fuji_tv/replay.m3u8?start={utc}',
      catchupType: 'default',
      directUrl: 'https://akariko-bck1.sankuria.sbs/stream/jp/fuji_tv/stream-output.m3u8?mode=hls',
      startTimeMs,
      durationMinutes: 60,
    });

    expect(url).toBe('https://akariko-bck1.sankuria.sbs/stream/jp/fuji_tv/replay.m3u8?start=1750000000');
  });

  it('should resolve catchup-source template with date specifiers ({Y}, {m}, {d}, {H}, {M}, {S})', () => {
    // 2026-07-26T12:30:00.000Z
    const startTimeMs = Date.UTC(2026, 6, 26, 12, 30, 0);
    const url = buildM3uCatchupUrl({
      catchupSource: 'http://server.com/replay?start={Y}-{m}-{d}T{H}:{M}:{S}&duration={duration}&channel={catchup-id}',
      catchupType: 'default',
      directUrl: 'http://server.com/live.m3u8',
      startTimeMs,
      durationMinutes: 30,
      epgChannelId: 'fuji_tv',
    });

    expect(url).toBe('http://server.com/replay?start=2026-07-26T12:30:00&duration=1800&channel=fuji_tv');
  });

  it('should fall back correctly for catchup="append"', () => {
    const startTimeMs = 1750000000000;
    const url = buildM3uCatchupUrl({
      catchupType: 'append',
      directUrl: 'http://server.com/live.m3u8',
      startTimeMs,
      durationMinutes: 60,
    });

    expect(url).toContain('http://server.com/live.m3u8?utc=1750000000&lutc=');
  });
});

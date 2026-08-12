import type { SportsEvent, SportsTeam } from '@ynotv/core';

/**
 * True when an event involves the favorite team. ESPN team IDs are only
 * unique within a league — e.g. id "18" is the NFL Saints but also the MLB
 * Astros — so matching by id alone makes unrelated games (like SF @ HOU)
 * appear as a favorite's game. Match league-aware whenever the favorite knows
 * its league; fall back to id-only for legacy favorites without a leagueId.
 * (Trade-off: a team's games in other competitions, e.g. a soccer favorite's
 * Champions League fixture, won't match here — the favorite card still shows
 * them via the team's own schedule.)
 */
export function eventInvolvesTeam(
  event: SportsEvent,
  team: Pick<SportsTeam, 'id' | 'leagueId'>
): boolean {
  const idMatch = event.homeTeam.id === team.id || event.awayTeam.id === team.id;
  if (!idMatch) return false;
  if (!team.leagueId || !event.league?.id) return true;
  return event.league.id === team.leagueId;
}

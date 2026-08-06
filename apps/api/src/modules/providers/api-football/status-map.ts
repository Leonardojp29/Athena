import type { MatchStatus } from '@athena/domain';

const STATUS_MAP: Record<string, MatchStatus> = {
  TBD: 'scheduled',
  NS: 'scheduled',
  '1H': 'in_play',
  '2H': 'in_play',
  ET: 'in_play',
  P: 'in_play',
  LIVE: 'in_play',
  HT: 'paused',
  BT: 'paused',
  FT: 'finished',
  AET: 'finished',
  PEN: 'finished',
  PST: 'postponed',
  SUSP: 'suspended',
  INT: 'suspended',
  CANC: 'cancelled',
  ABD: 'abandoned',
  AWD: 'awarded',
  WO: 'awarded',
};

export function mapMatchStatus(short: string): MatchStatus {
  return STATUS_MAP[short] ?? 'scheduled';
}

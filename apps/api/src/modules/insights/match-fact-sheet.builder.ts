import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';

export interface MatchFactSheet {
  partido: {
    competencia: string;
    temporada: number;
    jornada: string | null;
    fecha: string;
    estado: string;
    local: string;
    visitante: string;
    golesLocal: number | null;
    golesVisitante: number | null;
    resultado: string;
  };
  eventos: Array<{
    minuto: string;
    tipo: string;
    equipo: string;
    jugador: string | null;
    asistencia: string | null;
  }>;
  tabla: Array<{
    equipo: string;
    posicion: number;
    puntos: number;
    jugados: number;
    diferenciaGoles: number;
  }>;
  historial: Array<{ fecha: string; local: string; marcador: string; visitante: string }>;
  forma: Array<{ equipo: string; orden: string; ultimosCinco: string; detalle: string[] }>;
}

const EVENT_LABEL: Record<string, string> = {
  goal: 'gol',
  own_goal: 'autogol',
  penalty_goal: 'gol de penal',
  missed_penalty: 'penal errado',
  yellow_card: 'tarjeta amarilla',
  red_card: 'tarjeta roja',
  substitution: 'cambio',
  var: 'revisión VAR',
};

@Injectable()
export class MatchFactSheetBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(matchId: string): Promise<MatchFactSheet> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        round: true,
        kickoffUtc: true,
        status: true,
        homeScore: true,
        awayScore: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        season: { select: { id: true, year: true, competition: { select: { name: true } } } },
        events: {
          orderBy: [{ minute: 'asc' }, { extraMinute: 'asc' }],
          select: {
            kind: true,
            minute: true,
            extraMinute: true,
            teamId: true,
            detail: true,
            player: { select: { name: true } },
            relatedPlayer: { select: { name: true } },
          },
        },
      },
    });
    if (!match) throw new NotFoundException(`Partido no encontrado: ${matchId}`);

    const teamName = (id: string): string =>
      id === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name;

    const [standings, headToHead, homeForm, awayForm] = await Promise.all([
      this.prisma.standing.findMany({
        where: { seasonId: match.season.id, teamId: { in: [match.homeTeamId, match.awayTeamId] } },
        select: {
          position: true,
          points: true,
          played: true,
          goalsFor: true,
          goalsAgainst: true,
          team: { select: { name: true } },
        },
      }),
      this.prisma.match.findMany({
        where: {
          id: { not: matchId },
          status: 'finished',
          OR: [
            { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
            { homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId },
          ],
        },
        orderBy: { kickoffUtc: 'desc' },
        take: 5,
        select: {
          kickoffUtc: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      }),
      this.recentForm(match.homeTeamId, match.kickoffUtc),
      this.recentForm(match.awayTeamId, match.kickoffUtc),
    ]);

    return {
      partido: {
        competencia: match.season.competition.name,
        temporada: match.season.year,
        jornada: match.round,
        fecha: match.kickoffUtc.toISOString(),
        estado: match.status,
        local: match.homeTeam.name,
        visitante: match.awayTeam.name,
        golesLocal: match.homeScore,
        golesVisitante: match.awayScore,
        resultado:
          match.homeScore === null || match.awayScore === null
            ? 'sin marcador'
            : match.homeScore > match.awayScore
              ? `victoria de ${match.homeTeam.name}`
              : match.homeScore < match.awayScore
                ? `victoria de ${match.awayTeam.name}`
                : 'empate',
      },
      eventos: match.events.map((event) => {
        const detail = event.detail as {
          playerName?: string | null;
          relatedPlayerName?: string | null;
        } | null;
        return {
          minuto: `${event.minute}${event.extraMinute ? `+${event.extraMinute}` : ''}`,
          tipo: EVENT_LABEL[event.kind] ?? event.kind,
          equipo: teamName(event.teamId),
          jugador: event.player?.name ?? detail?.playerName ?? null,
          asistencia: event.relatedPlayer?.name ?? detail?.relatedPlayerName ?? null,
        };
      }),
      tabla: standings.map((row) => ({
        equipo: row.team.name,
        posicion: row.position,
        puntos: row.points,
        jugados: row.played,
        diferenciaGoles: row.goalsFor - row.goalsAgainst,
      })),
      historial: headToHead.map((game) => ({
        fecha: game.kickoffUtc.toISOString().slice(0, 10),
        local: game.homeTeam.name,
        marcador: `${game.homeScore ?? 0}-${game.awayScore ?? 0}`,
        visitante: game.awayTeam.name,
      })),
      forma: [
        { equipo: match.homeTeam.name, ...homeForm },
        { equipo: match.awayTeam.name, ...awayForm },
      ],
    };
  }

  private async recentForm(
    teamId: string,
    before: Date,
  ): Promise<{ orden: string; ultimosCinco: string; detalle: string[] }> {
    const games = await this.prisma.match.findMany({
      where: {
        status: 'finished',
        kickoffUtc: { lt: before },
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      orderBy: { kickoffUtc: 'desc' },
      take: 5,
      select: {
        homeScore: true,
        awayScore: true,
        homeTeamId: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });

    const detalle: string[] = [];
    const letters: string[] = [];
    for (const game of games) {
      const isHome = game.homeTeamId === teamId;
      const own = (isHome ? game.homeScore : game.awayScore) ?? 0;
      const rival = (isHome ? game.awayScore : game.homeScore) ?? 0;
      letters.push(own > rival ? 'G' : own < rival ? 'P' : 'E');
      detalle.push(
        `${game.homeTeam.name} ${game.homeScore ?? 0}-${game.awayScore ?? 0} ${game.awayTeam.name}`,
      );
    }
    return {
      // sin esta aclaración el modelo puede leer la racha en orden cronológico inverso
      orden: 'del partido más reciente al más antiguo',
      ultimosCinco: letters.join('') || 'sin partidos previos',
      detalle,
    };
  }
}

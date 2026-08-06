import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

/**
 * Verifica los JWT que emite Supabase Auth contra su JWKS (ES256).
 * La autenticación es de Supabase; la autorización es regla de negocio de Athena (ADR-001 aplica
 * igual acá: el proveedor de identidad es reemplazable, el dominio no depende de él).
 */
@Injectable()
export class SupabaseTokenService {
  private readonly logger = new Logger(SupabaseTokenService.name);
  private readonly jwks = createRemoteJWKSet(
    new URL('/auth/v1/.well-known/jwks.json', process.env.SUPABASE_URL ?? 'http://localhost'),
  );

  async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, { audience: 'authenticated' });
      if (!payload.sub) throw new Error('token sin sub');
      return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : null };
    } catch (error) {
      this.logger.debug(`Token rechazado: ${String(error)}`);
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }
}

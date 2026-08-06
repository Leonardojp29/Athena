import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { SupabaseTokenService, type AuthenticatedUser } from './supabase-token.service.js';

// Solo lo que el guard necesita del request: evita depender de los tipos de Express.
interface RequestWithUser {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: SupabaseTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Falta el token');

    request.user = await this.tokens.verify(header.slice('Bearer '.length));
    return true;
  }
}

/** Usuario ya verificado por AuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) throw new UnauthorizedException();
    return request.user;
  },
);

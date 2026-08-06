import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { SupabaseTokenService } from './supabase-token.service.js';

@Global()
@Module({
  providers: [SupabaseTokenService, AuthGuard],
  exports: [SupabaseTokenService, AuthGuard],
})
export class AuthModule {}

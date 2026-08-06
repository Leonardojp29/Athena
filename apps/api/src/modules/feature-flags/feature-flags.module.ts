import { Global, Module } from '@nestjs/common';
import { FeatureFlagController } from './feature-flag.controller.js';
import { FeatureFlagService } from './feature-flag.service.js';

@Global()
@Module({
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}

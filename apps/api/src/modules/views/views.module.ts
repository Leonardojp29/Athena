import { Module } from '@nestjs/common';
import { MundoService } from './mundo.service.js';
import { ViewsController } from './views.controller.js';
import { ViewsService } from './views.service.js';

@Module({
  controllers: [ViewsController],
  providers: [ViewsService, MundoService],
})
export class ViewsModule {}

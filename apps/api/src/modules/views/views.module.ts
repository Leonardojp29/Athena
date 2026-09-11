import { Module } from '@nestjs/common';
import { CalentarVistasUseCase } from './calentar-vistas.usecase.js';
import { MundoService } from './mundo.service.js';
import { ViewsController } from './views.controller.js';
import { ViewsService } from './views.service.js';

@Module({
  controllers: [ViewsController],
  providers: [ViewsService, MundoService, CalentarVistasUseCase],
  exports: [CalentarVistasUseCase],
})
export class ViewsModule {}

import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { logJson } from './observability.js';
import { abrirOrigenDeLaVista, origenDeLaVista } from './origen-de-la-vista.js';

interface PeticionHttp {
  method: string;
  originalUrl?: string;
  url: string;
}

interface RespuestaHttp {
  statusCode: number;
  setHeader(nombre: string, valor: string): void;
}

/**
 * Cuánto tardó cada petición y si la sirvió la caché.
 *
 * El API no medía nada, así que un despliegue lento y uno rápido se veían igual en los logs. La
 * cabecera `x-cache` hace que un `curl` alcance para saber si lo que se está midiendo es el cálculo
 * o la caché.
 */
@Injectable()
export class DuracionInterceptor implements NestInterceptor {
  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    const http = contexto.switchToHttp();
    const peticion = http.getRequest<PeticionHttp>();
    const respuesta = http.getResponse<RespuestaHttp>();
    const arranque = Date.now();
    abrirOrigenDeLaVista();

    return siguiente.handle().pipe(
      tap({
        next: () => registrar(),
        error: () => registrar(),
      }),
    );

    function registrar(): void {
      const origen = origenDeLaVista();
      if (origen) respuesta.setHeader('x-cache', origen);
      logJson('info', 'peticion', {
        metodo: peticion.method,
        ruta: peticion.originalUrl ?? peticion.url,
        estado: respuesta.statusCode,
        ms: Date.now() - arranque,
        cache: origen,
      });
    }
  }
}

import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { logJson, newRequestId, reportError } from './observability.js';

interface MinimalRequest {
  method?: string;
  url?: string;
}

interface MinimalResponse {
  status(code: number): MinimalResponse;
  json(body: unknown): void;
}

/**
 * Ningún error sale sin registro. Los 5xx llevan un id que también se devuelve al
 * cliente, así un reporte de usuario se puede cruzar con el log exacto.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<MinimalRequest>();
    const response = http.getResponse<MinimalResponse>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp
      ? exception.getResponse()
      : { statusCode: status, message: 'Error interno' };

    if (status >= 500) {
      const requestId = newRequestId();
      logJson('error', 'unhandled_exception', {
        requestId,
        method: request.method,
        path: request.url,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
      reportError(exception, { requestId, path: request.url });
      response.status(status).json({ statusCode: status, message: 'Error interno', requestId });
      return;
    }

    this.logger.warn(`${status} ${request.method} ${request.url}`);
    response.status(status).json(message);
  }
}

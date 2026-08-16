/*
 * El puente de Vercel: cada request del proyecto cae acá y se entrega al API ya compilado.
 * Import estático a propósito: el paquete es ESM ("type": "module"), y además así el trazador
 * de Vercel sigue la cadena completa de dependencias desde el build real, no adivina.
 */
import handler from '../dist/serverless.js';

export default handler;

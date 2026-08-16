/*
 * El puente de Vercel: cada request del proyecto cae acá y se entrega al API ya compilado.
 * Es JavaScript plano a propósito: el build real lo hace `tsc` en el buildCommand, y este archivo
 * solo enchufa; así lo que corre en Vercel es el mismo dist que corre en cualquier otro lado.
 */
module.exports = async (req, res) => {
  const { default: handler } = await import('../dist/serverless.js');
  return handler(req, res);
};

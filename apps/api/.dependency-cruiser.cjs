/**
 * Reglas que protegen la arquitectura en el build, no solo en la revisión.
 * ADR-001: el dominio es de Athena; los proveedores son detalles reemplazables.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-provider-fuera-del-adaptador',
      comment:
        'Los modelos y clientes de un proveedor externo no pueden salir de su carpeta. ' +
        'Depende del puerto del dominio (FootballDataProvider, NarrativeGenerator) y de los tokens de DI. ' +
        'Los *.module.ts quedan exentos: son raíces de composición y su trabajo es justamente elegir el adaptador.',
      severity: 'error',
      from: { pathNot: ['^src/modules/providers/', '\\.module\\.ts$'] },
      to: { path: '^src/modules/providers/(api-football|openai)/' },
    },
    {
      name: 'dominio-no-depende-de-infraestructura',
      comment: 'packages/domain no puede importar Prisma, Nest ni nada de infraestructura.',
      severity: 'error',
      from: { path: 'node_modules/@athena/domain' },
      to: { path: 'node_modules/(@prisma|@nestjs|ioredis|bullmq|openai)' },
    },
    {
      name: 'sin-ciclos',
      comment: 'Un ciclo entre módulos suele significar que falta extraer algo.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'sin-huerfanos',
      comment: 'Archivo que nadie importa: o falta conectarlo o hay que borrarlo.',
      severity: 'warn',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '(^|/)tsconfig', '\\.config\\.(js|cjs|mjs|ts)$'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(\\.test\\.ts$|__fixtures__)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
    reporterOptions: { text: { highlightFocused: true } },
  },
};

// Importar antes que nada en los scripts que usan el cliente HTTP.
//
// Un error de axios que nadie atrapa se imprime entero, con la petición y sus cabeceras:
// la API key incluida. Y un `await` de nivel superior que falla no llega como
// unhandledRejection sino como uncaughtException, así que hacen falta los dos.
const quiet = (e) => {
  const detail = e?.response?.data?.detail ?? e?.response?.data ?? e?.message ?? e;
  console.error(`FALLO: ${e?.response?.status ?? ''} ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`.trim());
  process.exit(1);
};
process.on('unhandledRejection', quiet);
process.on('uncaughtException', quiet);

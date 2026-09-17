export type ComplementoNiveles = { cercanos: string[]; lejanos: string[] };

export const COMPLEMENTOS_CURADOS: Record<string, ComplementoNiveles> = {
  televisor: {
    cercanos: ['soporte para tv', 'cable hdmi', 'barra de sonido', 'estabilizador'],
    lejanos: ['parlantes', 'chromecast', 'consola', 'home theater'],
  },
  'smart tv': {
    cercanos: ['soporte para tv', 'barra de sonido', 'chromecast'],
    lejanos: ['parlantes', 'consola', 'auriculares'],
  },
  heladera: {
    cercanos: ['estabilizador', 'organizadores'],
    lejanos: ['freezer', 'dispenser de agua', 'microondas'],
  },
  freezer: {
    cercanos: ['estabilizador', 'organizadores'],
    lejanos: ['heladera', 'conservadora'],
  },
  'aire acondicionado': {
    cercanos: ['estabilizador', 'soporte para aire'],
    lejanos: ['ventilador', 'climatizador', 'purificador de aire'],
  },
  climatizador: {
    cercanos: ['estabilizador'],
    lejanos: ['ventilador', 'aire acondicionado'],
  },
  lavarropas: {
    cercanos: ['jabon liquido', 'estabilizador'],
    lejanos: ['secarropas', 'tender', 'plancha'],
  },
  cocina: {
    cercanos: ['garrafa', 'bateria de cocina'],
    lejanos: ['microondas', 'campana', 'horno electrico', 'anafe'],
  },
  microondas: {
    cercanos: ['recipientes aptos microondas'],
    lejanos: ['horno electrico', 'cocina', 'bateria de cocina'],
  },
  notebook: {
    cercanos: ['mouse', 'mochila para notebook', 'cooler para notebook'],
    lejanos: ['monitor', 'teclado', 'impresora', 'auriculares'],
  },
  laptop: {
    cercanos: ['mouse', 'mochila para notebook'],
    lejanos: ['monitor', 'teclado', 'impresora'],
  },
  computadora: {
    cercanos: ['monitor', 'teclado', 'mouse'],
    lejanos: ['impresora', 'parlantes', 'webcam', 'estabilizador'],
  },
  monitor: {
    cercanos: ['soporte de monitor', 'teclado', 'mouse'],
    lejanos: ['webcam', 'parlantes', 'notebook'],
  },
  celular: {
    cercanos: ['funda', 'cargador', 'vidrio templado', 'auriculares'],
    lejanos: ['parlantes', 'smartwatch', 'power bank', 'televisor'],
  },
  smartphone: {
    cercanos: ['funda', 'cargador', 'vidrio templado', 'auriculares'],
    lejanos: ['parlantes', 'smartwatch', 'power bank', 'televisor'],
  },
  parlante: {
    cercanos: ['pilas', 'cable auxiliar'],
    lejanos: ['auriculares', 'microfono', 'barra de sonido'],
  },
  auricular: {
    cercanos: ['estuche', 'cable auxiliar'],
    lejanos: ['parlantes', 'celular', 'power bank'],
  },
  camara: {
    cercanos: ['memoria microsd', 'tripode'],
    lejanos: ['estabilizador', 'iluminacion', 'mochila'],
  },
  consola: {
    cercanos: ['joystick', 'juegos'],
    lejanos: ['televisor', 'auriculares', 'silla gamer'],
  },
  playstation: {
    cercanos: ['joystick', 'juegos'],
    lejanos: ['televisor', 'auriculares', 'silla gamer'],
  },
};

export function complementosPara(qLower: string, haystack: string[], max = 6): string[] {
  const out = new Set<string>();
  for (const [clave, niveles] of Object.entries(COMPLEMENTOS_CURADOS)) {
    if (haystack.some((h) => h.includes(clave))) {
      for (const s of niveles.cercanos) if (s.toLowerCase() !== qLower) out.add(s);
    }
  }
  return [...out].slice(0, max);
}

export function complementosNiveles(
  haystack: string[],
  qLower = '',
): ComplementoNiveles {
  const cercanos = new Set<string>();
  const lejanos = new Set<string>();
  for (const [clave, niveles] of Object.entries(COMPLEMENTOS_CURADOS)) {
    if (haystack.some((h) => h.includes(clave))) {
      for (const s of niveles.cercanos) if (s.toLowerCase() !== qLower) cercanos.add(s);
      for (const s of niveles.lejanos) if (s.toLowerCase() !== qLower) lejanos.add(s);
    }
  }
  for (const c of cercanos) lejanos.delete(c);
  return { cercanos: [...cercanos], lejanos: [...lejanos] };
}

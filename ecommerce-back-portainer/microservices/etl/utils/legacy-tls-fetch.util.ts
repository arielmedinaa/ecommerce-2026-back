import { Agent, fetch as undiciFetch } from 'undici';

// Algunas APIs legacy (Consoft/CEC y similares, ej. Abba) sirven HTTPS con
// claves DH chicas y/o certificados autofirmados vencidos. `curl` las tolera
// por defecto, pero el `fetch` global de Node las rechaza
// (ERR_SSL_DH_KEY_TOO_SMALL / CERT_HAS_EXPIRED) aunque la IP ya esté
// autorizada y los datos sean válidos. Este dispatcher relaja el nivel de
// seguridad TLS SOLO para las llamadas que explícitamente lo usan, sin tocar
// la configuración global de Node (que sigue validando certificados
// normalmente para el resto de las conexiones del proceso: Claude, S3, otros
// proveedores, etc).
const legacyAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
    ciphers: 'DEFAULT@SECLEVEL=0',
    minVersion: 'TLSv1',
  },
});

export function fetchLegacyTls(url: string, init?: RequestInit): Promise<Response> {
  return undiciFetch(url, { ...init, dispatcher: legacyAgent } as any) as unknown as Promise<Response>;
}

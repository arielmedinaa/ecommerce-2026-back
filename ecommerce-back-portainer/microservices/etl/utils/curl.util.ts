import { execFile } from 'child_process';

export interface CurlResult {
  statusCode: number | null;
  body: string;
  comando: string;
  error?: string;
}

export function runCurl(params: {
  method: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}): Promise<CurlResult> {
  const args = ['-s', '-o', '-', '-w', '\n__STATUS__:%{http_code}', '-X', params.method, '--max-time', String(Math.ceil((params.timeoutMs ?? 10000) / 1000))];

  Object.entries(params.headers || {}).forEach(([key, value]) => {
    args.push('-H', `${key}: ${value}`);
  });

  if (params.body) {
    args.push('-d', params.body);
  }

  args.push(params.url);

  const comando = `curl ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`;

  return new Promise((resolve) => {
    execFile('curl', args, { timeout: (params.timeoutMs ?? 10000) + 2000 }, (error, stdout) => {
      if (error) {
        resolve({ statusCode: null, body: '', comando, error: error.message });
        return;
      }
      const marker = '\n__STATUS__:';
      const idx = stdout.lastIndexOf(marker);
      if (idx === -1) {
        resolve({ statusCode: null, body: stdout, comando });
        return;
      }
      const body = stdout.slice(0, idx);
      const statusCode = Number(stdout.slice(idx + marker.length).trim());
      resolve({ statusCode: Number.isFinite(statusCode) ? statusCode : null, body, comando });
    });
  });
}

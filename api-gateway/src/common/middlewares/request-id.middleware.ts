import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '@shared/common/logging/request-context';

function pickIncomingRequestId(req: Request): string | undefined {
  const header =
    (req.headers['x-request-id'] as string | string[] | undefined) ??
    (req.headers['x-correlation-id'] as string | string[] | undefined);

  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requestIdMiddleware(
  req: Request & { requestId?: string; user?: any },
  res: Response,
  next: NextFunction,
) {
  const requestId = pickIncomingRequestId(req) || uuidv4();
  req.requestId = requestId;

  res.setHeader('x-request-id', requestId);

  const userId = req.user?.sub ? String(req.user.sub) : undefined;
  RequestContext.run({ requestId, userId }, () => next());
}


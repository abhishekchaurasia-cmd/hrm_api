import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as Record<string, unknown> | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  }
);

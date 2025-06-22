import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';

export const GetUserWs = createParamDecorator(
  (data: string | undefined, context: ExecutionContext): any => {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const user = client.data.user;

    if (!user) {
      throw new Error('User not found. Ensure WsJwtGuard is applied.');
    }

    return data ? user[data] : user;
  },
);
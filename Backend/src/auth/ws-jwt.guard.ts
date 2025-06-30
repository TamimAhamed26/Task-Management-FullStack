import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import * as cookie from 'cookie';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {
    console.log('🛠️ [WsJwtGuard] Constructor called with dependencies:', {
      jwtService: !!jwtService,
      userService: !!userService,
      authService: !!authService,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🛡️ [WsJwtGuard] Guard activated');
    const client: Socket = context.switchToWs().getClient<Socket>();

    const user = await extractUserFromSocket(
      client,
      this.jwtService,
      this.authService,
      this.userService,
    );

    client.data.user = user;

    console.log(`✅ [WsJwtGuard] Client ${client.id} authenticated as ${user.username}`);
    return true;
  }
}

// ✅ SHARED FUNCTION TO REUSE IN handleConnection
export async function extractUserFromSocket(
  client: Socket,
  jwtService: JwtService,
  authService: AuthService,
  userService: UserService,
): Promise<any> {
  const headers = client.handshake.headers;
  const authToken = client.handshake.auth?.token;

  console.log('📥 [extractUserFromSocket] Headers:', headers);
  console.log('📥 [extractUserFromSocket] Cookie:', headers.cookie);
  console.log('📥 [extractUserFromSocket] Auth field:', authToken);
  console.log('📥 [extractUserFromSocket] Authorization header:', headers.authorization);

  let token: string | undefined;

  if (authToken && typeof authToken === 'string') {
    token = authToken;
    console.log('🔐 [extractUserFromSocket] Token from auth field:', token);
  } else if (headers.cookie) {
    const parsedCookies = cookie.parse(headers.cookie);
    token = parsedCookies['accessToken'];
    console.log('🍪 [extractUserFromSocket] Token from cookie:', token);
  } else if (headers.authorization?.startsWith('Bearer ')) {
    token = headers.authorization.split(' ')[1];
    console.log('🔐 [extractUserFromSocket] Token from Authorization header:', token);
  }

  if (!token) {
    console.warn(`❌ [extractUserFromSocket] No token found for client ${client.id}`);
    throw new UnauthorizedException('No authentication token provided.');
  }

  const isBlacklisted = await authService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    console.warn(`❌ [extractUserFromSocket] Token is blacklisted for client ${client.id}`);
    throw new UnauthorizedException('Token is blacklisted.');
  }

  const payload = jwtService.verify(token, { secret: 'mysecretkey' });

  if (!payload.sub || !payload.email || !payload.role) {
    console.warn(`❌ [extractUserFromSocket] Invalid token payload:`, payload);
    throw new UnauthorizedException('Invalid token payload.');
  }

  const user = await userService.findById(payload.sub);
  if (!user || !user.isVerified || !user.username) {
    console.warn(`❌ [extractUserFromSocket] Invalid user`);
    throw new UnauthorizedException('Invalid user account.');
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role?.name?.toUpperCase() || payload.role.toUpperCase(),
  };
}

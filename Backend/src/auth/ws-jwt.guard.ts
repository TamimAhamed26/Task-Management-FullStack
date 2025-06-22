import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import * as cookie from 'cookie';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('WsJwtGuard invoked');
    const client: Socket = context.switchToWs().getClient<Socket>();
    const headers = client.handshake.headers;

    let token: string | undefined;
    if (headers.cookie) {
      const parsedCookies = cookie.parse(headers.cookie);
      token = parsedCookies['accessToken']; 
    }
    if (!token && client.handshake.auth?.token && typeof client.handshake.auth.token === 'string') {
      token = client.handshake.auth.token;
    }
    if (!token && client.handshake.headers?.authorization?.startsWith('Bearer ')) {
      token = client.handshake.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.warn(`[WsJwtGuard] No token found for client ${client.id}`);
      throw new UnauthorizedException('No authentication token provided.');
    }

    if (await this.authService.isTokenBlacklisted(token)) {
      console.warn(`[WsJwtGuard] Token is blacklisted for client ${client.id}`);
      throw new UnauthorizedException('Token is blacklisted.');
    }

    try {
      const payload: any = this.jwtService.verify(token, { secret: 'mysecretkey' });
      if (!payload.sub || !payload.email || !payload.role) {
        console.warn(`[WsJwtGuard] Invalid token payload for client ${client.id}:`, payload);
        throw new UnauthorizedException('Invalid token payload.');
      }

      const user = await this.userService.findById(payload.sub);
      console.log('User from DB in WsJwtGuard:', user);
      if (!user || !user.isVerified) {
        console.warn(`[WsJwtGuard] User not found or not verified for payload sub: ${payload.sub}`);
        throw new UnauthorizedException('User not found or not verified.');
      }

      client.data.user = { // Use client.data.user for GetUserWs
        id: user.id,
        email: user.email,
        username: user.username || 'unknown',
        role: user.role?.name?.toUpperCase() || payload.role.toUpperCase(),
      };
      console.log(`[WsJwtGuard] Client ${client.id} authenticated as ${user.username}`);
      return true;
    } catch (e) {
      console.error(`[WsJwtGuard] Token validation failed for client ${client.id}: ${e.message}`);
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
import {
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Logger, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';

import { UserService } from '../user/user.service';
import { GetUserWs } from '../auth/decorators/get-user-ws.decorator';
import { extractUserFromSocket, WsJwtGuard } from '../auth/ws-jwt.guard';

@WebSocketGateway({ namespace: '/chat', cors: { origin: 'http://localhost:3000', credentials: true } })
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
  private readonly authService: AuthService,
    private readonly jwtService: JwtService,

  private readonly userService: UserService,
  ) {
    this.logger.log('🛠️ ChatGateway initialized with WsJwtGuard');
  }

  afterInit(server: Server) {
    this.logger.log('🚀 ChatGateway initialized');
  }

 async handleConnection(@ConnectedSocket() client: Socket) {
  this.logger.log(`🔗 [Connection] Client ${client.id} attempting connection`);
  try {
    const user = await extractUserFromSocket(client, this.jwtService, this.authService, this.userService);
    client.data.user = user;
    this.logger.log(`✅ [Connection] Client ${client.id} connected as ${user.username}`);
    client.join(`user_${user.id}`);
  } catch (err) {
    this.logger.warn(`❌ [Connection] Auth failed for client ${client.id}: ${err.message}`);
    client.disconnect();
  }
}


  handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    const username = user?.username || 'unauthenticated';
    this.logger.log(`🔌 [Disconnection] Client ${client.id} disconnected (${username})`);
  }


  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody('conversationId') conversationId: number,
    @GetUserWs() user: any,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`[joinConversation] User ${user.id} attempting to join room ${conversationId}`);
    try {
      await this.chatService.getConversationById(conversationId, user.id);
      client.join(conversationId.toString());
      this.logger.log(`[joinConversation] ✅ User ${user.id} successfully joined room ${conversationId}`);
      client.emit('joinedConversation', { conversationId });
    } catch (error) {
      this.logger.error(`[joinConversation] ❌ Failed for user ${user.id} to join ${conversationId}: ${error.message}`);
      client.emit('error', { message: `Failed to join conversation: ${error.message}` });
    }
  }
  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @MessageBody('conversationId') conversationId: number,
    @ConnectedSocket() client: Socket,
    @GetUserWs() user: any,
  ) {
    client.leave(conversationId.toString());
    this.logger.log(`Client ${client.id} (User: ${user?.username || 'unknown'}) left conversation room ${conversationId}`);
    client.emit('leftConversation', { conversationId });
  }

public emitTestMessage(conversationId: number) {
  this.server.to(conversationId.toString()).emit('receiveMessage', {
    id: Date.now(),
    conversationId,
    content: '🧪 Fake socket message from backend!',
    sender: { id: 999, username: 'System' },
    timestamp: new Date(),
  });
}

// ✅ BACKEND
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { conversationId: number; content: string },
    @GetUserWs() user: any,
    @ConnectedSocket() client: Socket,
    // The callback is the last argument provided by the client's emit.
    // It might not always be provided, so we mark it as optional.
    callback?: (response: { success: boolean; message?: any; error?: string }) => void,
  ) {
    // THIS IS THE LOG YOU ARE MISSING
    this.logger.log(`[SubscribeMessage] ✅ 'sendMessage' handler reached for user ${user.id}.`);

    try {
      const savedMessage = await this.chatService.saveMessage(data.conversationId, user.id, data.content);

      const payload = {
        id: savedMessage.id,
        content: savedMessage.content,
        timestamp: savedMessage.timestamp,
        sender: savedMessage.sender,
        conversationId: savedMessage.conversation.id,
      };

      // Broadcast the new message to everyone in the conversation room
      this.server.to(data.conversationId.toString()).emit('receiveMessage', payload);
      this.logger.log(`[SubscribeMessage] 📢 Broadcasted message ${savedMessage.id} to room ${data.conversationId}`);

      // If a callback was provided by the client, call it to acknowledge success
      if (typeof callback === 'function') {
        this.logger.log(`[SubscribeMessage] 👍 Sending success ACK to client ${client.id}`);
        callback({ success: true, message: payload });
      }

    } catch (error) {
      this.logger.error(`[SubscribeMessage] ❌ Error in sendMessage: ${error.message}`);
      if (typeof callback === 'function') {
        this.logger.log(`[SubscribeMessage] 👎 Sending error ACK to client ${client.id}`);
        callback({ success: false, error: error.message });
      }
    }
  }


}
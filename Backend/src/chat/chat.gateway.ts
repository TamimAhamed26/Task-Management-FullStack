import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseGuards, Logger } from '@nestjs/common';
import { GetUserWs } from '../auth/decorators/get-user-ws.decorator';
import { WsJwtGuard } from 'src/auth/ws-jwt.guard';

@UseGuards(WsJwtGuard)
@WebSocketGateway({ namespace: '/chat', cors: { origin: 'http://localhost:3000', credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    this.logger.log('Chat Gateway Initialized');
  }

  async handleConnection(@ConnectedSocket() client: Socket, @GetUserWs() user: any) {
    try {
      if (!user) {
        this.logger.warn(`[handleConnection] User not attached to client. Disconnecting.`);
        return client.disconnect();
      }

      this.logger.log(
        `Client connected to chat: ${client.id}, User: ${user.username || 'unknown'} (ID: ${user.id})`,
      );
      client.join(`user_${user.id}`);
    } catch (error) {
      this.logger.error(`[handleConnection] Unexpected error during connection: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    this.logger.log(`Client disconnected: ${client.id} (${user?.username || 'unauthenticated'})`);
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody('conversationId') conversationId: number,
    @GetUserWs() user: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.getConversationById(conversationId, user.id);
      client.join(conversationId.toString());
      this.logger.log(`User ${user.username || 'unknown'} (ID: ${user.id}) joined conversation room ${conversationId}`);
      client.emit('joinedConversation', { conversationId });
    } catch (error) {
      this.logger.error(`[joinConversation] Failed to join conversation ${conversationId}: ${error.message}`);
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

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { conversationId: number; content: string },
    @GetUserWs() user: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const message = await this.chatService.saveMessage(data.conversationId, user.id, data.content);
      this.server.to(data.conversationId.toString()).emit('receiveMessage', {
        id: message.id,
        conversationId: message.conversationId,
        sender: { id: user.id, username: user.username || 'unknown' },
        content: message.content,
        timestamp: message.timestamp,
      });

      const conversation = await this.chatService.getConversationById(data.conversationId, user.id);
      const otherParticipants = conversation.participants
        .filter(p => p.userId !== user.id)
        .map(p => p.userId);
      for (const participantId of otherParticipants) {
        this.server.to(`user_${participantId}`).emit('newMessageNotification', {
          conversationId: message.conversationId,
          message: `${user.username || 'unknown'} sent a message`,
          senderId: user.id,
          timestamp: message.timestamp,
        });
      }

      await this.chatService.markMessagesAsRead(data.conversationId, user.id);
    } catch (error) {
      this.logger.error(`[sendMessage] Error sending message: ${error.message}`);
      client.emit('error', { message: `Failed to send message: ${error.message}` });
    }
  }
}
import { Controller, Get, Post, Body, Param, ParseIntPipe, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { GetUser } from '../auth/decorators/get-user.decorator'; 
import { User } from '../entities/user.entity';
import { ChatGateway } from './chat.gateway'; 

@Controller('chat')
@UseGuards(JwtAuthGuard) 
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway, 
  ) {}

  @Post('conversations')
  async createConversation(
    @Body('userIds') userIds: number[],
    @Body('type') type: 'direct' | 'group',
    @GetUser() currentUser: User,
  ) {
    if (!userIds.includes(currentUser.id)) {
      userIds.push(currentUser.id); 
    }
    return this.chatService.createConversation(userIds, type);
  }

  @Get('conversations')
  async getUserConversations(@GetUser() user: User) {
    return this.chatService.getUserConversations(user.id);
  }
  @Get('available-users')
  async getAvailableUsers(@Req() req: Request) {
    const user = req.user as any;
    return this.chatService.getAvailableUsers(user.id);
  }
  @Get('conversations/:id/messages')
  async getConversationMessages(
    @Param('id', ParseIntPipe) conversationId: number,
    @GetUser() user: User,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 50,
  ) {
    return this.chatService.getMessagesInConversation(conversationId, user.id, page, limit);
  }

  @Post('conversations/:id/read')
  async markConversationAsRead(
    @Param('id', ParseIntPipe) conversationId: number,
    @GetUser() user: User,
  ) {
    await this.chatService.markMessagesAsRead(conversationId, user.id);
    return { message: 'Conversation marked as read.' };
  }

@Post('conversations/:id/fake-message')
async simulateFakeMessage(
  @Param('id', ParseIntPipe) conversationId: number,
  @GetUser() user: User,
) {
  const message = await this.chatService.saveMessage(conversationId, user.id, '🔥 This is a simulated message!');
  return message;
}
  @Get('debug/emit-message/:conversationId')
  emitFakeSocketMessage(@Param('conversationId', ParseIntPipe) id: number) {
    this.chatGateway.emitTestMessage(id); // ⬅️ Call method in gateway
    return { message: 'Fake message emitted to frontend' };
  }


}
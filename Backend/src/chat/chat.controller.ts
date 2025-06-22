import { Controller, Get, Post, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { GetUser } from '../auth/decorators/get-user.decorator'; 
import { User } from '../entities/user.entity';

@Controller('chat')
@UseGuards(JwtAuthGuard) 
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createConversation(
    @Body('userIds') userIds: number[],
    @Body('type') type: 'direct' | 'group',
    @GetUser() currentUser: User,
  ) {
    if (!userIds.includes(currentUser.id)) {
      userIds.push(currentUser.id); // Ensure creator is part of the conversation
    }
    return this.chatService.createConversation(userIds, type);
  }

  @Get('conversations')
  async getUserConversations(@GetUser() user: User) {
    return this.chatService.getUserConversations(user.id);
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
}
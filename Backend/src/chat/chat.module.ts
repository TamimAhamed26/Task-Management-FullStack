// src/chat/chat.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { ConversationParticipant } from '../entities/participant.entity';
import { User } from '../entities/user.entity';
import { Token } from '../entities/token.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

import { AuthModule } from '../auth/auth.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      ConversationParticipant,
      Token,
      User,
    ]),
    AuthModule, // This correctly provides the WsJwtGuard
    UserModule,
  ],
  providers: [
    ChatGateway,
    ChatService,
  ],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
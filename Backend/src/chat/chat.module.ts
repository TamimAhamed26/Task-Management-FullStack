// src/chat/chat.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt'; 

import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { ConversationParticipant } from '../entities/participant.entity';
import { User } from '../entities/user.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AuthModule } from '../auth/auth.module';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { Token } from 'src/entities/token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, ConversationParticipant,Token, User]),
 
    JwtModule.register({
      secret: 'mysecretkey', 
      signOptions: { expiresIn: '1h' }, 
    }),
 
    forwardRef(() => AuthModule),
  ],
  providers: [
    ChatGateway,
    ChatService,
    WsJwtGuard, 
  ],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { ConversationParticipant } from 'src/entities/participant.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(ConversationParticipant)
    private participantRepository: Repository<ConversationParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createConversation(userIds: number[], type: 'direct' | 'group'): Promise<Conversation> {
    if (userIds.length < 2) {
      throw new BadRequestException('A conversation must have at least two participants.');
    }

    const users = await this.userRepository.find({ where: { id: In(userIds) } });
    if (users.length !== userIds.length) {
      throw new NotFoundException('One or more users not found.');
    }

    // For direct chats, check if a conversation already exists
if (type === 'direct' && userIds.length === 2) {
  const [user1Id, user2Id] = userIds.sort((a, b) => a - b);

  const existingConversation = await this.conversationRepository
    .createQueryBuilder('conversation')
    .innerJoin('conversation.participants', 'p')
    .where('conversation.type = :type', { type: 'direct' })
    .andWhere('p.userId IN (:...userIds)', { userIds: [user1Id, user2Id] })
    .groupBy('conversation.id')
    .having('COUNT(p.userId) = 2')
    .getOne();

  if (existingConversation) {
    return existingConversation;
  }
}


    const conversation = this.conversationRepository.create({ type });
    const savedConversation = await this.conversationRepository.save(conversation);

    const participants = users.map(user => this.participantRepository.create({
      user,
      conversation: savedConversation,
    }));
    await this.participantRepository.save(participants);

    return savedConversation;
  }

  async getConversationById(conversationId: number, requestingUserId: number): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user'],
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const isParticipant = conversation.participants.some(p => p.userId === requestingUserId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation.');
    }

    return conversation;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    const conversations = await this.conversationRepository.find({
      relations: ['participants', 'participants.user', 'messages'],
      where: { participants: { userId: userId } },
      order: { updatedAt: 'DESC' }, // Order by last message time if you update this on new message
    });

    // Filter and only show conversations where the requesting user is a participant
    return conversations.filter(conv => conv.participants.some(p => p.userId === userId));
  }

  async getMessagesInConversation(conversationId: number, requestingUserId: number, page = 1, limit = 50): Promise<Message[]> {
    const conversation = await this.getConversationById(conversationId, requestingUserId); // Checks participation

    const messages = await this.messageRepository.find({
      where: { conversation: { id: conversation.id } },
      relations: ['sender'],
      order: { timestamp: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return messages;
  }

 async saveMessage(conversationId: number, senderId: number, content: string): Promise<Message> {
  console.log('🔥 saveMessage called with:', { conversationId, senderId, content });

  const conversation = await this.conversationRepository.findOne({
    where: { id: conversationId },
    relations: ['participants']
  });

  if (!conversation) {
    console.warn('❌ Conversation not found for ID:', conversationId);
    throw new NotFoundException('Conversation not found.');
  }

  console.log('✅ Found conversation:', conversation.id);
  console.log('🧑‍🤝‍🧑 Participants:', conversation.participants.map(p => p.userId));

  const isSenderParticipant = conversation.participants.some(p => p.userId === senderId);
  if (!isSenderParticipant) {
    console.warn(`❌ User ${senderId} is NOT a participant of conversation ${conversationId}`);
    throw new ForbiddenException('Sender is not a participant in this conversation.');
  }

  console.log(`✅ User ${senderId} is a participant. Proceeding to save message.`);

  const message = this.messageRepository.create({
    conversation,
    sender: { id: senderId } as User,
    content,
  });
  const savedMessage = await this.messageRepository.save(message);
  console.log('✅ Message saved:', savedMessage.id);

  conversation.updatedAt = new Date();
  await this.conversationRepository.save(conversation);

  await this.participantRepository.createQueryBuilder()
    .update(ConversationParticipant)
    .set({ lastReadAt: null })
    .where("conversationId = :conversationId", { conversationId })
    .andWhere("userId != :senderId", { senderId })
    .execute();

  return savedMessage;
}

async getAvailableUsers(currentUserId: number): Promise<User[]> {
  const users = await this.userRepository.find();
  return users.filter(u => u.id !== currentUserId);
}
  async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { conversation: { id: conversationId }, user: { id: userId } },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found in this conversation.');
    }
    participant.lastReadAt = new Date();
    await this.participantRepository.save(participant);
  }
}
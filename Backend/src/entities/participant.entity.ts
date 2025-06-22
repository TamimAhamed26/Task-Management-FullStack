import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from './user.entity';
import { Conversation } from './conversation.entity';

@Entity()
export class ConversationParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.conversationParticipants, { onDelete: 'CASCADE' })
  user: User;
  @Column()
  userId: number; // Foreign key

  @ManyToOne(() => Conversation, conversation => conversation.participants, { onDelete: 'CASCADE' })
  conversation: Conversation;
  @Column()
  conversationId: number; // Foreign key

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt: Date | null; // To track when a participant last read messages in this conversation
}
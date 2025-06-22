import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversation, conversation => conversation.messages, { onDelete: 'CASCADE' })
  conversation: Conversation;
  @Column()
  conversationId: number; // Foreign key

  @ManyToOne(() => User, user => user.sentMessages)
  sender: User;
  @Column()
  senderId: number; // Foreign key

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  timestamp: Date;
}
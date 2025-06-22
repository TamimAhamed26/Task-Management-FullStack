import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity'; 
import { Message } from './message.entity';
import { ConversationParticipant } from './participant.entity'; 

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: 'direct' }) 
  type: string;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];

  @OneToMany(() => ConversationParticipant, participant => participant.conversation)
  participants: ConversationParticipant[]; 

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


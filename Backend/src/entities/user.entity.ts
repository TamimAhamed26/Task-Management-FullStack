import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { Role } from './role.entity';
import { Token } from './token.entity';
import { Notification } from 'src/entities/Notification.entity'; 
import { Project } from './project.entity';
import { Team } from './team.entity';
import { Message } from './message.entity';
import { ConversationParticipant } from './participant.entity';

@Entity()
export class User {
  
@PrimaryGeneratedColumn()
id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  phone: string;

  @ManyToOne(() => Role, role => role.users, { eager: true })
  role: Role;

  @OneToMany(() => Token, token => token.user)
  tokens: Token[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isVerified: boolean;
  
  @Column({ nullable: true })
  lastActiveAt?: Date;

@OneToMany(() => Notification, notification => notification.recipient)
notifications: Notification[];
  @OneToMany(() => Project, project => project.owner)
  ownedProjects: Project[];

  @ManyToMany(() => Team, team => team.members)
  teams: Team[];

  @OneToMany(() => Message, message => message.sender)
  sentMessages: Message[];

  @OneToMany(() => ConversationParticipant, participant => participant.user)
  conversationParticipants: ConversationParticipant[];

}

export { Role };

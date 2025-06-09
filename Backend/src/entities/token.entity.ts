import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum TokenType {
  VERIFICATION = 'VERIFICATION',
  RESET_PASSWORD = 'RESET_PASSWORD',
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
}
@Entity()
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

 @ManyToOne(() => User, user => user.tokens, {
  onDelete: 'CASCADE',
  nullable: false,
  eager: false,
})
@JoinColumn({ name: 'userId' }) 
user: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'enum', enum: TokenType })
  type: TokenType;
}
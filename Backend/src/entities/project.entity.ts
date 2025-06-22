import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, ManyToMany, JoinTable } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';
import { Team } from './team.entity';

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => User, user => user.ownedProjects)
  owner: User;

  @Column()
  ownerId: number;

  @OneToMany(() => Task, task => task.project)
  tasks: Task[];

  @ManyToMany(() => Team, team => team.projects)
@JoinTable()
teams: Team[];
}
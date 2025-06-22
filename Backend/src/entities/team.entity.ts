import { Entity, PrimaryGeneratedColumn, ManyToMany, JoinTable, OneToOne, JoinColumn, Column } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

@Entity()
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => User, user => user.teams)
  @JoinTable()
  members: User[];

@ManyToMany(() => Project, project => project.teams)
projects: Project[];
}
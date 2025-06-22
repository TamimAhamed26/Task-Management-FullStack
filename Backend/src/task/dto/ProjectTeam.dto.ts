import { IsInt } from 'class-validator';

export class AddTeamMemberDto {
  @IsInt()
  memberId: number;

  @IsInt()
  teamId: number;
}
export class RemoveTeamMemberDto {
  @IsInt()
  memberId: number;

  @IsInt()
  teamId: number;

}

export class AddTeamToProjectDto {
  @IsInt()
  teamId: number;
}
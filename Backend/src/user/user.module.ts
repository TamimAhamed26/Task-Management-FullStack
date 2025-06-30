// src/user/user.module.ts
import { Module, forwardRef } from '@nestjs/common'; // 👈 Import forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module'; // 👈 Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    FileModule,
    forwardRef(() => AuthModule), // 👈 ADD THIS LINE
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
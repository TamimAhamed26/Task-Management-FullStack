import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Token } from './entities/token.entity';
import { AuthModule } from './auth/auth.module';
import { RefreshTokenMiddleware } from './auth/refresh-token.middleware';
import { UserModule } from './user/user.module';
import { FileModule } from './file/file.module';
import { EmailModule } from './email/email.module';
import { Task } from './entities/task.entity';
import { TaskModule } from './task/task.module';
import { TaskController } from './task/task.controller';
import { UserController } from './user/user.controller';
import { ProgressModule } from './progress/progress.module';
import { PaymentModule } from './payment/payment.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'root',
      database: 'task_management_db',
      entities: [User, Role, Token, Task],
      synchronize: true,
      autoLoadEntities: true,
    }),
    JwtModule.register({
      secret: 'mysecretkey', 
      signOptions: { expiresIn: '30m' },
    }),
    AuthModule,
    TypeOrmModule.forFeature([User, Token]),
    UserModule,
    FileModule,
    EmailModule,
    TaskModule,
    ProgressModule,
    PaymentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RefreshTokenMiddleware)
      
      .forRoutes(UserController, TaskController);  
  }
}

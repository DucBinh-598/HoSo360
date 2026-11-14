import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { ApiController, TokenGuard } from './api.controller';
import { ApiService } from './api.service';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h' } }),
  ],
  controllers: [ApiController, FilesController],
  providers: [PrismaService, ApiService, FilesService, TokenGuard],
})
export class AppModule {}

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  ExecutionContext,
  CanActivate,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiService } from './api.service';
import { PrismaService } from './prisma.service';
@Injectable()
export class TokenGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private db: PrismaService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const r = ctx.switchToHttp().getRequest();
    const h = r.headers.authorization || '';
    const t = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!t) throw new UnauthorizedException('Vui lòng đăng nhập');
    let p: any;
    try {
      p = this.jwt.verify(t);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    const u = await this.db.user.findUnique({
      where: { id: p.sub },
      select: { active: true, role: true, companyId: true },
    });
    if (!u || !u.active) throw new UnauthorizedException('Tài khoản đã bị khóa hoặc không tồn tại');
    r.user = { ...p, role: u.role, companyId: u.companyId };
    return true;
  }
}
@Controller()
export class ApiController {
  constructor(
    private s: ApiService,
    private jwt: JwtService,
  ) {}
  @Post('auth/register') register(@Body() d: any) {
    return this.s.register(d);
  }
  @Post('auth/login') login(@Body() d: any) {
    return this.s.login(d);
  }
  @Get('dashboard') @UseGuards(TokenGuard) dashboard(@Req() r: any) {
    return this.s.dashboard(r.user);
  }
  @Get('dossiers') @UseGuards(TokenGuard) list(
    @Req() r: any,
    @Query('q') q = '',
    @Query('status') st = '',
  ) {
    return this.s.dossiers(r.user, q, st);
  }
  @Post('dossiers') @UseGuards(TokenGuard) create(@Req() r: any, @Body() d: any) {
    return this.s.createDossier(r.user, d);
  }
  @Get('dossiers/:id') @UseGuards(TokenGuard) detail(
    @Req() r: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.s.detail(r.user, id);
  }
  @Patch('dossiers/:id') @UseGuards(TokenGuard) update(
    @Req() r: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: any,
  ) {
    return this.s.updateDossier(r.user, id, d);
  }
  @Post('dossiers/:id/submit') @UseGuards(TokenGuard) submit(
    @Req() r: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: any,
  ) {
    return this.s.submit(r.user, id, d);
  }
  @Post('dossiers/:id/decision') @UseGuards(TokenGuard) decide(
    @Req() r: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: any,
  ) {
    return this.s.decide(r.user, id, d);
  }
  @Get('users') @UseGuards(TokenGuard) users(@Req() r: any) {
    return this.s.users(r.user);
  }
  @Post('users') @UseGuards(TokenGuard) addUser(@Req() r: any, @Body() d: any) {
    return this.s.addUser(r.user, d);
  }
  @Get('approvals') @UseGuards(TokenGuard) approvals(@Req() r: any, @Query('tab') tab = 'mine') {
    return this.s.approvals(r.user, tab);
  }
  @Get('activity') @UseGuards(TokenGuard) activities(@Req() r: any) {
    return this.s.activities(r.user);
  }
}

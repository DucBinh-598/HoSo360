import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { DossierStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
@Injectable()
export class ApiService {
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
  ) {}
  private need(u: any, r: string[]) {
    if (!r.includes(u.role))
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
  }
  private session(u: any, companyName: string, companyCode: string) {
    return {
      accessToken: this.jwt.sign({
        sub: u.id,
        companyId: u.companyId,
        role: u.role,
        email: u.email,
      }),
      user: {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        companyId: u.companyId,
        companyName,
        companyCode,
      },
    };
  }
  async register(d: any) {
    if (!d.companyName || !d.taxCode || !d.fullName || !d.email || !d.companyCode || !d.password)
      throw new BadRequestException('Vui lòng nhập đủ thông tin bắt buộc');
    const slug = String(d.companyCode).trim().toLowerCase();
    if (!/^[a-z0-9-]{3,30}$/.test(slug))
      throw new BadRequestException('Mã doanh nghiệp gồm 3-30 ký tự a-z, 0-9 hoặc dấu gạch ngang');
    if (d.password.length < 8) throw new BadRequestException('Mật khẩu cần ít nhất 8 ký tự');
    if (await this.db.company.findUnique({ where: { slug } }))
      throw new BadRequestException('Mã doanh nghiệp đã tồn tại');
    if (await this.db.company.findUnique({ where: { taxCode: d.taxCode } }))
      throw new BadRequestException('Mã số thuế đã tồn tại');
    const hash = await bcrypt.hash(d.password, 12);
    const c = await this.db.company.create({
      data: {
        name: d.companyName,
        slug,
        taxCode: d.taxCode,
        address: d.address,
        phone: d.companyPhone,
        users: {
          create: { fullName: d.fullName, email: d.email, passwordHash: hash, role: 'ADMIN' },
        },
      },
      include: { users: true },
    });
    return this.session(c.users[0], c.name, c.slug);
  }
  async login(d: any) {
    const co = await this.db.company.findUnique({
      where: {
        slug: String(d.companyCode || '')
          .trim()
          .toLowerCase(),
      },
    });
    const u =
      co &&
      (await this.db.user.findUnique({
        where: { companyId_email: { companyId: co.id, email: d.email } },
        include: { company: true },
      }));
    if (!u || !u.active || !(await bcrypt.compare(d.password, u.passwordHash)))
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.session(u, u.company.name, u.company.slug);
  }
  async dashboard(u: any) {
    const w = { companyId: u.companyId };
    const [total, pending, approved, rejected, users, recent] = await Promise.all([
      this.db.dossier.count({ where: w }),
      this.db.dossier.count({ where: { ...w, status: 'PENDING' } }),
      this.db.dossier.count({ where: { ...w, status: 'APPROVED' } }),
      this.db.dossier.count({ where: { ...w, status: 'REJECTED' } }),
      this.db.user.count({ where: { companyId: u.companyId, active: true } }),
      this.db.dossier.findMany({ where: w, take: 8, orderBy: { updatedAt: 'desc' } }),
    ]);
    return { total, pending, approved, rejected, users, recent };
  }
  async dossiers(u: any, q = '', status = '') {
    if (status && !Object.values(DossierStatus).includes(status as DossierStatus)) {
      throw new BadRequestException('Trạng thái hồ sơ không hợp lệ');
    }
    return this.db.dossier.findMany({
      where: {
        companyId: u.companyId,
        ...(status ? { status: status as DossierStatus } : {}),
        ...(q ? { OR: [{ title: { contains: q } }, { code: { contains: q } }] } : {}),
      },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
  async createDossier(u: any, d: any) {
    this.need(u, ['ADMIN', 'MANAGER', 'STAFF']);
    const item = await this.db.dossier.create({
      data: {
        code: d.code || `HS-${Date.now()}`,
        title: d.title,
        category: d.category || 'Khác',
        description: d.description,
        department: d.department,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        companyId: u.companyId,
        createdById: u.sub,
      },
    });
    await this.log(u.sub, 'Tạo hồ sơ', item.code);
    return item;
  }
  async detail(u: any, id: number) {
    const x = await this.db.dossier.findFirst({
      where: { id, companyId: u.companyId },
      include: {
        createdBy: { select: { fullName: true } },
        steps: {
          include: { approver: { select: { fullName: true } } },
          orderBy: { stepNo: 'asc' },
        },
        approvals: {
          include: { approver: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!x) throw new NotFoundException('Không tìm thấy hồ sơ');
    return x;
  }
  async updateDossier(u: any, id: number, d: any) {
    this.need(u, ['ADMIN', 'MANAGER', 'STAFF']);
    await this.detail(u, id);
    return this.db.dossier.update({
      where: { id },
      data: {
        title: d.title,
        category: d.category,
        description: d.description,
        department: d.department,
        dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
      },
    });
  }
  async submit(u: any, id: number, d: any) {
    this.need(u, ['ADMIN', 'MANAGER', 'STAFF']);
    const x = await this.detail(u, id);
    if (!['DRAFT', 'REJECTED'].includes(x.status))
      throw new BadRequestException('Chỉ gửi duyệt được hồ sơ nháp hoặc bị từ chối');
    const list: any[] = Array.isArray(d?.steps) ? d.steps : [];
    if (list.length < 1 || list.length > 5)
      throw new BadRequestException('Quy trình cần từ 1 đến 5 bước ký');
    const ids = list.map((s) => Number(s.approverId));
    const ok = await this.db.user.findMany({
      where: {
        id: { in: ids },
        companyId: u.companyId,
        active: true,
        role: { in: ['ADMIN', 'MANAGER'] },
      },
      select: { id: true },
    });
    if (ids.some((i) => !ok.find((o) => o.id === i)))
      throw new BadRequestException(
        'Người ký phải là Quản trị viên hoặc Quản lý hồ sơ đang hoạt động',
      );
    await this.db.$transaction([
      this.db.approvalStep.deleteMany({ where: { dossierId: id } }),
      this.db.approvalStep.createMany({
        data: list.map((s, i) => ({
          dossierId: id,
          stepNo: i + 1,
          title: String(s.title || 'Duyệt').slice(0, 100),
          approverId: ids[i],
          status: i === 0 ? 'PENDING' : 'WAITING',
        })),
      }),
      this.db.dossier.update({ where: { id }, data: { status: 'PENDING' } }),
    ]);
    await this.log(u.sub, 'Gửi duyệt', x.code);
    return this.detail(u, id);
  }
  async decide(u: any, id: number, d: any) {
    const x = await this.detail(u, id);
    if (x.status !== 'PENDING') throw new BadRequestException('Hồ sơ không ở trạng thái chờ duyệt');
    const step = x.steps.find((s) => s.status === 'PENDING');
    if (!step || step.approverId !== u.sub)
      throw new ForbiddenException('Chưa đến lượt bạn ký hoặc bạn không phải người ký bước này');
    const decision = ['APPROVED', 'REJECTED', 'CHANGES'].includes(d?.decision) ? d.decision : null;
    if (!decision) throw new BadRequestException('Quyết định không hợp lệ');
    const me = await this.db.user.findUnique({ where: { id: u.sub }, select: { fullName: true } });
    const next = x.steps.find((s) => s.stepNo === step.stepNo + 1);
    const ops: any[] = [
      this.db.approvalStep.update({
        where: { id: step.id },
        data: {
          status: decision,
          comment: d.comment,
          signedAt: new Date(),
          signature: me.fullName,
        },
      }),
      this.db.approval.create({
        data: { dossierId: id, approverId: u.sub, decision, comment: d.comment },
      }),
    ];
    if (decision === 'APPROVED') {
      ops.push(
        next
          ? this.db.approvalStep.update({ where: { id: next.id }, data: { status: 'PENDING' } })
          : this.db.dossier.update({ where: { id }, data: { status: 'APPROVED' } }),
      );
    } else {
      ops.push(
        this.db.approvalStep.updateMany({
          where: { dossierId: id, status: 'WAITING' },
          data: { status: 'CANCELLED' },
        }),
        this.db.dossier.update({
          where: { id },
          data: { status: decision === 'REJECTED' ? 'REJECTED' : 'DRAFT' },
        }),
      );
    }
    await this.db.$transaction(ops);
    await this.log(u.sub, decision, x.code);
    return this.detail(u, id);
  }
  async approvals(u: any, tab = 'mine') {
    const status =
      tab === 'signed' ? ['APPROVED'] : tab === 'rejected' ? ['REJECTED', 'CHANGES'] : ['PENDING'];
    return this.db.approvalStep.findMany({
      where: {
        approverId: u.sub,
        status: { in: status },
        dossier: { companyId: u.companyId, ...(tab === 'mine' ? { status: 'PENDING' } : {}) },
      },
      include: {
        dossier: { select: { id: true, code: true, title: true, steps: { select: { id: true } } } },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }
  async users(u: any) {
    return this.db.user.findMany({
      where: { companyId: u.companyId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        department: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async addUser(u: any, d: any) {
    this.need(u, ['ADMIN']);
    if (!d.email || !d.fullName) throw new BadRequestException('Thiếu họ tên hoặc email');
    if (!['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'].includes(d.role || 'STAFF'))
      throw new BadRequestException('Vai trò không hợp lệ');
    if (
      await this.db.user.findUnique({
        where: { companyId_email: { companyId: u.companyId, email: d.email } },
      })
    )
      throw new BadRequestException('Email đã tồn tại trong doanh nghiệp');
    const nu = await this.db.user.create({
      data: {
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        department: d.department,
        role: d.role || 'STAFF',
        passwordHash: await bcrypt.hash(d.password || 'ChangeMe123!', 12),
        companyId: u.companyId,
      },
      select: { id: true, fullName: true, email: true, role: true, department: true, active: true },
    });
    await this.log(u.sub, 'Tạo tài khoản', d.email);
    return nu;
  }
  async activities(u: any) {
    return this.db.activityLog.findMany({
      where: { user: { companyId: u.companyId } },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  private async log(userId: number, action: string, detail: string) {
    await this.db.activityLog.create({ data: { userId, action, detail } });
  }
}

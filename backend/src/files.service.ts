import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { basename, extname, join, resolve } from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

type UserContext = { sub: number; companyId: number; role: string };
export type LocalUpload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class FilesService {
  private readonly storageRoot = resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'));

  constructor(private db: PrismaService) {}

  private requireWriter(user: UserContext) {
    if (!['ADMIN', 'MANAGER', 'STAFF'].includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
  }

  private parseId(value: unknown, label: string): number | null {
    if (value === undefined || value === null || value === '') return null;
    if (
      (typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && !/^\d+$/.test(value))
    ) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
    return id;
  }

  private safeName(value: string) {
    const name = basename(String(value || '').replace(/\\/g, '/'))
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 180);
    return name || 'tai-lieu';
  }

  static isAllowedUpload(name: string, mimeType: string) {
    const extension = extname(name).toLowerCase();
    return Boolean(ALLOWED_TYPES[extension] && ALLOWED_TYPES[extension] === mimeType);
  }

  private async validateUpload(file?: LocalUpload) {
    if (!file?.buffer) throw new BadRequestException('Vui lòng chọn tệp cần tải lên');
    if (file.size < 1) throw new BadRequestException('Tệp tải lên không được để trống');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('Dung lượng tối đa là 10 MB');
    if (!FilesService.isAllowedUpload(file.originalname, file.mimetype)) {
      throw new BadRequestException('Định dạng tệp chưa được hỗ trợ');
    }
    await mkdir(this.storageRoot, { recursive: true });
  }

  private storedPath(key: string) {
    if (!/^[0-9a-f-]{36}$/i.test(key)) throw new NotFoundException('Không tìm thấy tệp');
    const path = resolve(this.storageRoot, key);
    if (path === this.storageRoot || resolve(path, '..') !== this.storageRoot) {
      throw new NotFoundException('Không tìm thấy tệp');
    }
    return path;
  }

  async listFolders(user: UserContext, parentValue?: string) {
    const parentId = this.parseId(parentValue, 'Thư mục cha');
    if (parentId !== null) {
      const parent = await this.db.documentFolder.findFirst({
        where: { id: parentId, companyId: user.companyId },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException('Không tìm thấy thư mục');
    }
    return this.db.documentFolder.findMany({
      where: { companyId: user.companyId, parentId },
      select: { id: true, name: true, parentId: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async createFolder(user: UserContext, input: { name?: string; parentId?: string }) {
    this.requireWriter(user);
    if (typeof input?.name !== 'string') {
      throw new BadRequestException('Tên thư mục cần từ 1 đến 100 ký tự');
    }
    const name = input.name.trim();
    if (!name || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) {
      throw new BadRequestException('Tên thư mục cần từ 1 đến 100 ký tự');
    }
    const parentId = this.parseId(input.parentId, 'Thư mục cha');
    if (parentId !== null) {
      const parent = await this.db.documentFolder.findFirst({
        where: { id: parentId, companyId: user.companyId },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException('Không tìm thấy thư mục cha');
    }
    if (
      await this.db.documentFolder.findFirst({
        where: { companyId: user.companyId, parentId, name },
        select: { id: true },
      })
    ) {
      throw new BadRequestException('Thư mục cùng tên đã tồn tại');
    }
    return this.db.documentFolder.create({
      data: { name, companyId: user.companyId, parentId, createdById: user.sub },
      select: { id: true, name: true, parentId: true, createdAt: true },
    });
  }

  async listFiles(user: UserContext, folderValue?: string) {
    const folderId = this.parseId(folderValue, 'Thư mục');
    if (folderId !== null) {
      const folder = await this.db.documentFolder.findFirst({
        where: { id: folderId, companyId: user.companyId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException('Không tìm thấy thư mục');
    }
    return this.db.storedFile.findMany({
      where: { companyId: user.companyId, folderId },
      include: {
        dossier: { select: { id: true, code: true, title: true } },
        createdBy: { select: { fullName: true } },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upload(user: UserContext, file: LocalUpload, input: { folderId?: string; dossierId?: string }) {
    this.requireWriter(user);
    await this.validateUpload(file);
    const folderId = this.parseId(input.folderId, 'Thư mục');
    const dossierId = this.parseId(input.dossierId, 'Hồ sơ');
    if (folderId !== null && !(await this.db.documentFolder.findFirst({
      where: { id: folderId, companyId: user.companyId },
      select: { id: true },
    }))) {
      throw new NotFoundException('Không tìm thấy thư mục');
    }
    if (dossierId !== null && !(await this.db.dossier.findFirst({
      where: { id: dossierId, companyId: user.companyId },
      select: { id: true },
    }))) {
      throw new NotFoundException('Không tìm thấy hồ sơ');
    }
    const storageKey = randomUUID();
    const storagePath = this.storedPath(storageKey);
    await writeFile(storagePath, file.buffer, { flag: 'wx' });
    try {
      return await this.db.$transaction(async (tx) => {
        const record = await tx.storedFile.create({
          data: {
            originalName: this.safeName(file.originalname),
            mimeType: file.mimetype,
            sizeBytes: file.size,
            companyId: user.companyId,
            folderId,
            dossierId,
            createdById: user.sub,
            versions: {
              create: {
                version: 1,
                storageKey,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                createdById: user.sub,
              },
            },
          },
          include: { _count: { select: { versions: true } } },
        });
        await tx.activityLog.create({
          data: { userId: user.sub, action: 'Tải tệp lên', detail: record.originalName },
        });
        return record;
      });
    } catch (error) {
      await unlink(storagePath);
      throw error;
    }
  }

  async uploadVersion(user: UserContext, id: number, file: LocalUpload) {
    this.requireWriter(user);
    await this.validateUpload(file);
    const record = await this.db.storedFile.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true, originalName: true, currentVersion: true },
    });
    if (!record) throw new NotFoundException('Không tìm thấy tệp');
    if (extname(this.safeName(file.originalname)).toLowerCase() !== extname(record.originalName).toLowerCase()) {
      throw new BadRequestException('Phiên bản mới phải giữ nguyên phần mở rộng của tệp');
    }
    const storageKey = randomUUID();
    const storagePath = this.storedPath(storageKey);
    await writeFile(storagePath, file.buffer, { flag: 'wx' });
    const nextVersion = record.currentVersion + 1;
    try {
      return await this.db.$transaction(async (tx) => {
        const version = await tx.fileVersion.create({
          data: {
            fileId: id,
            version: nextVersion,
            storageKey,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            createdById: user.sub,
          },
        });
        await tx.storedFile.update({
          where: { id },
          data: { currentVersion: nextVersion, mimeType: file.mimetype, sizeBytes: file.size },
        });
        await tx.activityLog.create({
          data: {
            userId: user.sub,
            action: 'Tải phiên bản mới',
            detail: `${record.originalName} · v${nextVersion}`,
          },
        });
        return version;
      });
    } catch (error) {
      await unlink(storagePath);
      throw error;
    }
  }

  async listVersions(user: UserContext, id: number) {
    const file = await this.db.storedFile.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true },
    });
    if (!file) throw new NotFoundException('Không tìm thấy tệp');
    return this.db.fileVersion.findMany({
      where: { fileId: id, file: { companyId: user.companyId } },
      select: {
        id: true,
        version: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        createdBy: { select: { fullName: true } },
      },
      orderBy: { version: 'desc' },
    });
  }

  async content(user: UserContext, id: number, versionValue?: string) {
    const file = await this.db.storedFile.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true, originalName: true, currentVersion: true },
    });
    if (!file) throw new NotFoundException('Không tìm thấy tệp');
    const versionNumber = versionValue ? this.parseId(versionValue, 'Phiên bản') : file.currentVersion;
    if (versionNumber === null) throw new BadRequestException('Phiên bản không hợp lệ');
    const version = await this.db.fileVersion.findFirst({
      where: { fileId: file.id, version: versionNumber, file: { companyId: user.companyId } },
      select: { storageKey: true, mimeType: true, sizeBytes: true },
    });
    if (!version) throw new NotFoundException('Không tìm thấy phiên bản');
    let buffer: Buffer;
    try {
      buffer = await readFile(this.storedPath(version.storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Không tìm thấy nội dung tệp trên máy chủ');
      }
      throw error;
    }
    return { buffer, name: this.safeName(file.originalName), mimeType: version.mimeType, sizeBytes: version.sizeBytes };
  }
}

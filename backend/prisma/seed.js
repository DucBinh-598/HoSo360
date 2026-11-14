const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

if (process.env.NODE_ENV === 'production') {
  throw new Error('Không được chạy dữ liệu demo trong môi trường production.');
}
if (process.env.DEMO_SEED !== 'true') {
  throw new Error('Chỉ chạy seed demo local sau khi đặt DEMO_SEED=true.');
}

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo1234!';

async function seedCompany({ name, slug, taxCode, users, dossiers }) {
  const company = await prisma.company.upsert({
    where: { slug },
    update: { name, taxCode },
    create: { name, slug, taxCode },
  });
  const seededUsers = {};

  for (const user of users) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    seededUsers[user.key] = await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email: user.email } },
      update: {
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        active: true,
        passwordHash,
      },
      create: {
        fullName: user.fullName,
        email: user.email,
        passwordHash,
        role: user.role,
        department: user.department,
        companyId: company.id,
      },
    });
  }

  for (const item of dossiers) {
    const dossier = await prisma.dossier.upsert({
      where: { companyId_code: { companyId: company.id, code: item.code } },
      update: {
        title: item.title,
        category: item.category,
        description: item.description,
        department: item.department,
        status: item.status,
        createdById: seededUsers[item.creator].id,
      },
      create: {
        code: item.code,
        title: item.title,
        category: item.category,
        description: item.description,
        department: item.department,
        status: item.status,
        companyId: company.id,
        createdById: seededUsers[item.creator].id,
      },
    });

    await prisma.approvalStep.deleteMany({ where: { dossierId: dossier.id } });
    if (item.approvers) {
      await prisma.approvalStep.createMany({
        data: item.approvers.map((key, index) => ({
          dossierId: dossier.id,
          stepNo: index + 1,
          title: index === 0 ? 'Trưởng phòng phê duyệt' : 'Ban giám đốc phê duyệt',
          approverId: seededUsers[key].id,
          status: item.status === 'APPROVED'
            ? 'APPROVED'
            : index === 0 && item.status === 'PENDING'
              ? 'PENDING'
              : 'WAITING',
          signature: item.status === 'APPROVED' ? seededUsers[item.approvers[index]].fullName : null,
          signedAt: item.status === 'APPROVED' ? new Date() : null,
        })),
      });
    }
  }
}

async function main() {
  await seedCompany({
    name: 'Công ty An Phát Demo',
    slug: 'anphat-demo',
    taxCode: 'DEMO-ANPHAT-360',
    users: [
      { key: 'admin', fullName: 'Nguyễn Minh Anh', email: 'admin@anphat.vn', role: 'ADMIN', department: 'Ban điều hành' },
      { key: 'manager', fullName: 'Trần Quốc Bảo', email: 'manager@anphat.vn', role: 'MANAGER', department: 'Hành chính' },
      { key: 'staff', fullName: 'Lê Thu Hà', email: 'staff@anphat.vn', role: 'STAFF', department: 'Nhân sự' },
      { key: 'viewer', fullName: 'Phạm Gia Linh', email: 'viewer@anphat.vn', role: 'VIEWER', department: 'Tài chính' },
    ],
    dossiers: [
      {
        code: 'HS-2026-001',
        title: 'Hợp đồng cung cấp thiết bị văn phòng',
        category: 'Hợp đồng',
        description: 'Hồ sơ demo để thử quy trình gửi duyệt nhiều bước.',
        department: 'Hành chính',
        status: 'PENDING',
        creator: 'staff',
        approvers: ['manager', 'admin'],
      },
      {
        code: 'HS-2026-002',
        title: 'Đề nghị tuyển dụng nhân sự quý IV',
        category: 'Nhân sự',
        description: 'Đề xuất bổ sung nhân sự cho bộ phận vận hành.',
        department: 'Nhân sự',
        status: 'DRAFT',
        creator: 'staff',
      },
      {
        code: 'HS-2026-003',
        title: 'Biên bản bàn giao tài sản',
        category: 'Khác',
        description: 'Hồ sơ mẫu đã được phê duyệt.',
        department: 'Tài chính',
        status: 'APPROVED',
        creator: 'admin',
      },
    ],
  });

  await seedCompany({
    name: 'Công ty Bình Minh Demo',
    slug: 'binhminh-demo',
    taxCode: 'DEMO-BINHMINH-360',
    users: [
      { key: 'admin', fullName: 'Đỗ Thanh Tùng', email: 'admin@binhminh.vn', role: 'ADMIN', department: 'Điều hành' },
    ],
    dossiers: [
      {
        code: 'BM-2026-001',
        title: 'Hồ sơ riêng của Công ty Bình Minh',
        category: 'Pháp lý',
        description: 'Dữ liệu thuộc tenant khác để kiểm tra phân tách doanh nghiệp.',
        department: 'Pháp lý',
        status: 'DRAFT',
        creator: 'admin',
      },
    ],
  });

  console.log('Đã tạo dữ liệu demo cho 2 doanh nghiệp. Mật khẩu demo: ' + DEMO_PASSWORD);
}

main()
  .catch((error) => {
    console.error('Không thể tạo dữ liệu demo:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据库初始化...');

  // 1. 创建默认组织
  const org = await prisma.organization.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      name: '默认组织',
      code: 'DEFAULT',
    },
  });
  console.log(`✅ 组织已创建: ${org.name} (${org.id})`);

  // 2. 创建管理员用户
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@icet.dev' },
    update: {},
    create: {
      name: '系统管理员',
      email: 'admin@icet.dev',
      passwordHash: adminPassword,
      role: 'ADMIN',
      organizationId: org.id,
      isActive: true,
    },
  });
  console.log(`✅ 管理员已创建: ${admin.email} (密码: admin123)`);

  // 3. 创建测试用户
  const testerPassword = await bcrypt.hash('tester123', 10);
  const tester = await prisma.user.upsert({
    where: { email: 'tester@icet.dev' },
    update: {},
    create: {
      name: '测试执行人',
      email: 'tester@icet.dev',
      passwordHash: testerPassword,
      role: 'TESTER',
      organizationId: org.id,
      isActive: true,
    },
  });
  console.log(`✅ 测试用户已创建: ${tester.email} (密码: tester123)`);

  // 4. 创建审阅人用户
  const reviewerPassword = await bcrypt.hash('reviewer123', 10);
  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@icet.dev' },
    update: {},
    create: {
      name: '测试审阅人',
      email: 'reviewer@icet.dev',
      passwordHash: reviewerPassword,
      role: 'REVIEWER',
      organizationId: org.id,
      isActive: true,
    },
  });
  console.log(`✅ 审阅人已创建: ${reviewer.email} (密码: reviewer123)`);

  console.log('\n🎉 数据库初始化完成！');
  console.log('--- 测试账号 ---');
  console.log('管理员: admin@icet.dev / admin123');
  console.log('测试人: tester@icet.dev / tester123');
  console.log('审阅人: reviewer@icet.dev / reviewer123');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

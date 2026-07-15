import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_PERMISSIONS = [
  'admin:dashboard',
  'admin:users',
  'admin:roles',
  'admin:permissions',
  'admin:campaigns',
  'admin:rewards',
  'admin:reports',
  'admin:audit-logs',
  'admin:settings',
];

const AMBASSADOR_PERMISSIONS = [
  'ambassador:dashboard',
  'ambassador:profile',
  'ambassador:referrals',
  'ambassador:rewards',
];

const CHAMPION_PERMISSIONS = [
  'champion:dashboard',
  'champion:profile',
  'champion:campaigns',
  'champion:tasks',
  'champion:leaderboard',
];

async function main() {
  console.log('🌱 Start seeding...');

  // Create all permissions
  const allPermissions = [
    ...new Set([...ADMIN_PERMISSIONS, ...AMBASSADOR_PERMISSIONS, ...CHAMPION_PERMISSIONS]),
  ];

  const dbPermissions = [];
  for (const permName of allPermissions) {
    const perm = await prisma.permission.upsert({
      where: { name: permName },
      update: {},
      create: {
        name: permName,
        description: `Allows action ${permName.replace(':', ' ')}`,
      },
    });
    dbPermissions.push(perm);
  }
  console.log(`🔑 Seeded ${dbPermissions.length} permissions.`);

  // Create ADMIN role and link all admin permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System Administrator with full access',
    },
  });

  // Link ADMIN permissions
  for (const permName of ADMIN_PERMISSIONS) {
    const perm = dbPermissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Create AMBASSADOR role and link ambassador permissions
  const ambassadorRole = await prisma.role.upsert({
    where: { name: 'AMBASSADOR' },
    update: {},
    create: {
      name: 'AMBASSADOR',
      description: 'Brand Ambassador role',
    },
  });

  for (const permName of AMBASSADOR_PERMISSIONS) {
    const perm = dbPermissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: ambassadorRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: ambassadorRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Create CHAMPION role and link champion permissions
  const championRole = await prisma.role.upsert({
    where: { name: 'CHAMPION' },
    update: {},
    create: {
      name: 'CHAMPION',
      description: 'Brand Champion role',
    },
  });

  for (const permName of CHAMPION_PERMISSIONS) {
    const perm = dbPermissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: championRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: championRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log('✅ Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

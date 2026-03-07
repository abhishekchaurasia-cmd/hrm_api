/* eslint-disable no-console */
import 'reflect-metadata';

import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

async function seedHrUser() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USERNAME ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'hrm_db',
    synchronize: false,
  });

  const hrEmail = process.env.HR_SEED_EMAIL ?? 'hr@company.com';
  const hrPassword = process.env.HR_SEED_PASSWORD;

  if (!hrPassword) {
    throw new Error('HR_SEED_PASSWORD is required to seed HR user securely.');
  }

  await dataSource.initialize();

  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
    const passwordHash = await bcrypt.hash(hrPassword, rounds);

    const existing: { id: string }[] = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      [hrEmail]
    );

    if (existing.length > 0) {
      await dataSource.query(
        `UPDATE users SET password = $1, role = 'hr', "isActive" = true WHERE email = $2`,
        [passwordHash, hrEmail]
      );
      console.log(`Updated HR user: ${hrEmail}`);
    } else {
      await dataSource.query(
        `INSERT INTO users (email, "firstName", "lastName", password, role, "isActive")
         VALUES ($1, $2, $3, $4, 'hr', true)`,
        [hrEmail, 'HR', 'Admin', passwordHash]
      );
      console.log(`Created HR user: ${hrEmail}`);
    }

    console.log('');
    console.log('HR User Credentials:');
    console.log(`  Email:    ${hrEmail}`);
    console.log(`  Password: (as provided via HR_SEED_PASSWORD)`);
    console.log('');
    console.log('Login: POST /api/v1/auth/login');
    console.log(`  { "email": "${hrEmail}", "password": "<your password>" }`);
  } finally {
    await dataSource.destroy();
  }
}

void seedHrUser();

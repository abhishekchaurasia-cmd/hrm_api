process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-must-be-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET =
  'test-refresh-secret-must-be-at-least-32-chars';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USERNAME = 'postgres';
process.env.DATABASE_PASSWORD = '';
process.env.DATABASE_NAME = 'hrm_test';

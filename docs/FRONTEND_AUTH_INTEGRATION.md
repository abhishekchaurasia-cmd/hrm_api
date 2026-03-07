# Frontend Auth Integration Guide (Next.js + NextAuth.js)

This guide covers integrating the HRM API authentication system with a Next.js frontend using NextAuth.js, including email/password login, Google OAuth, and role-based access control.

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [NextAuth.js Setup](#2-nextauthjs-setup)
3. [Auth Context & Hooks](#3-auth-context--hooks)
4. [API Integration Patterns](#4-api-integration-patterns)
5. [Login & Registration Pages](#5-login--registration-pages)
6. [RBAC in the Frontend](#6-rbac-in-the-frontend)

---

## 1. Environment Variables

Add these to your Next.js `.env.local`:

```env
# NextAuth
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (obtain from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> `NEXT_PUBLIC_API_URL` is exposed to the browser. Never prefix secrets with `NEXT_PUBLIC_`.

---

## 2. NextAuth.js Setup

### Install dependencies

```bash
npm install next-auth
```

### Create the route handler

**`app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        );

        if (!res.ok) return null;

        const body = await res.json();
        const { accessToken, refreshToken, user } = body.data;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          accessToken,
          refreshToken,
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in: persist backend tokens and role
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.role = user.role;
        token.userId = user.id;
      }

      // Google sign-in: exchange the Google id_token with the backend
      if (account?.provider === 'google' && account.id_token) {
        // If you add a backend endpoint for Google token exchange,
        // call it here to get accessToken/refreshToken/role.
        // For now, store the Google account info.
        token.provider = 'google';
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = token.role as string;
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

### Extend NextAuth types

**`types/next-auth.d.ts`**

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
    accessToken: string;
    refreshToken: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    provider?: string;
  }
}
```

### Wrap the app with SessionProvider

**`app/providers.tsx`**

```tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**`app/layout.tsx`**

```tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 3. Auth Context & Hooks

### useAuth hook

```typescript
// hooks/use-auth.ts
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    accessToken: session?.accessToken ?? null,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',

    loginWithCredentials: (email: string, password: string) =>
      signIn('credentials', { email, password, redirect: false }),

    loginWithGoogle: () => signIn('google', { callbackUrl: '/' }),

    logout: () => signOut({ callbackUrl: '/login' }),

    hasRole: (role: string) => session?.user?.role === role,
    hasAnyRole: (...roles: string[]) =>
      roles.includes(session?.user?.role ?? ''),
  };
}
```

### Protected route wrapper

```tsx
// components/protected-route.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  roles,
  fallback,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return fallback ?? <div>Loading...</div>;
  }

  if (!session) return null;

  if (roles && !roles.includes(session.user.role)) {
    return <div>You do not have permission to view this page.</div>;
  }

  return <>{children}</>;
}
```

---

## 4. API Integration Patterns

### API client with token injection

```typescript
// lib/api-client.ts
import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (session?.accessToken) {
    (headers as Record<string, string>)['Authorization'] =
      `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // If 401, attempt token refresh
  if (res.status === 401 && session?.refreshToken) {
    const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (refreshRes.ok) {
      const refreshBody = await refreshRes.json();
      // Note: you'll need to update the session with the new tokens.
      // This can be done via NextAuth's update() or by re-signing in.
      (headers as Record<string, string>)['Authorization'] =
        `Bearer ${refreshBody.data.accessToken}`;

      return fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  return res;
}

export const api = {
  get: (path: string) => apiFetch(path),

  post: (path: string, body: unknown) =>
    apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: (path: string, body: unknown) =>
    apiFetch(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
};
```

### Usage example

```typescript
// Fetch profile
const res = await api.get('/api/v1/auth/profile');
const { data } = await res.json();
```

---

## 5. Login & Registration Pages

### Login page

```tsx
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { loginWithCredentials, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await loginWithCredentials(email, password);

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/');
    }

    setLoading(false);
  }

  return (
    <div>
      <h1>Sign In</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <hr />

      <button onClick={loginWithGoogle}>Sign in with Google</button>

      <p>
        Don't have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
}
```

### Registration page

```tsx
// app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.message ?? 'Registration failed');
      setLoading(false);
      return;
    }

    router.push('/login?registered=true');
  }

  return (
    <div>
      <h1>Create Account</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
            minLength={2}
          />
        </div>

        <div>
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
            minLength={2}
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}
```

---

## 6. RBAC in the Frontend

### Middleware-based route protection

```typescript
// middleware.ts (project root)
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    // HR-only routes
    if (path.startsWith('/hr') && role !== 'hr') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/hr/:path*', '/profile/:path*'],
};
```

### Component-level role gating

```tsx
// components/role-gate.tsx
'use client';

import { useAuth } from '@/hooks/use-auth';

interface RoleGateProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { hasAnyRole, isLoading } = useAuth();

  if (isLoading) return null;

  if (!hasAnyRole(...roles)) return <>{fallback}</>;

  return <>{children}</>;
}
```

### Usage

```tsx
import { RoleGate } from '@/components/role-gate';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <RoleGate roles={['hr']}>
        <section>
          <h2>HR Panel</h2>
          <p>Manage employees, departments, and leave requests.</p>
        </section>
      </RoleGate>

      <RoleGate
        roles={['employee']}
        fallback={<p>Employee features are not available for your role.</p>}
      >
        <section>
          <h2>My Leave Requests</h2>
        </section>
      </RoleGate>
    </div>
  );
}
```

---

## API Reference (Backend Endpoints)

| Method | Path                         | Auth   | Description               |
| ------ | ---------------------------- | ------ | ------------------------- |
| POST   | `/api/v1/auth/register`      | Public | Create a new account      |
| POST   | `/api/v1/auth/login`         | Public | Login, returns JWT tokens |
| POST   | `/api/v1/auth/refresh-token` | Public | Refresh an access token   |
| GET    | `/api/v1/auth/profile`       | Bearer | Get current user profile  |

### Response shapes

**Login response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "employee"
    }
  }
}
```

**Register response:**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "employee"
  }
}
```

**Profile response:**

```json
{
  "success": true,
  "message": "Profile retrieved",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "employee"
  }
}
```

**Refresh token response:**

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

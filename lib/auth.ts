import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

const sessionMaxAgeSec = 60 * 60 * 12; // 12h
const sessionUpdateAgeSec = 60 * 15; // revalidate every 15m

async function loadActiveUser(login: string) {
  return prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [{ username: login }, { email: login }],
    },
    include: {
      role: true,
      branch: true,
    },
  });
}

function toAuthUser(
  user: NonNullable<Awaited<ReturnType<typeof loadActiveUser>>>,
) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    role: {
      id: user.role.id,
      name: user.role.name,
    },
    branch: user.branch
      ? {
          id: user.branch.id,
          name: user.branch.name,
          code: user.branch.code,
        }
      : null,
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: sessionMaxAgeSec,
    updateAge: sessionUpdateAgeSec,
  },
  jwt: {
    maxAge: sessionMaxAgeSec,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        login: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!process.env.NEXTAUTH_SECRET) {
          console.error("[auth] NEXTAUTH_SECRET is not configured");
          throw new Error("AUTH_MISCONFIGURED");
        }

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        try {
          const user = await loadActiveUser(parsed.data.login);
          if (!user) return null;

          const ok = await compare(parsed.data.password, user.passwordHash);
          if (!ok) return null;

          return toAuthUser(user);
        } catch (error) {
          console.error("[auth] login failed:", error);
          throw new Error("DATABASE_UNAVAILABLE");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.branch = user.branch;
        token.username = user.username ?? null;
        token.lastValidated = Date.now();
        token.invalid = false;
        return token;
      }

      const last =
        typeof token.lastValidated === "number" ? token.lastValidated : 0;
      const stale = Date.now() - last > sessionUpdateAgeSec * 1000;

      if ((trigger === "update" || stale) && token.id) {
        try {
          const dbUser = await prisma.user.findFirst({
            where: { id: String(token.id), isActive: true },
            include: { role: true, branch: true },
          });
          if (!dbUser) {
            token.invalid = true;
            return token;
          }
          token.role = { id: dbUser.role.id, name: dbUser.role.name };
          token.branch = dbUser.branch
            ? {
                id: dbUser.branch.id,
                name: dbUser.branch.name,
                code: dbUser.branch.code,
              }
            : null;
          token.username = dbUser.username;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.lastValidated = Date.now();
          token.invalid = false;
        } catch (error) {
          console.error("[auth] session revalidation failed:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.invalid || !token.id || !token.role) {
        // Signal unauthenticated session to the client / middleware
        return {
          ...session,
          user: {
            ...session.user,
            id: "",
            role: { id: "", name: "" },
            branch: null,
            username: null,
          },
          expires: new Date(0).toISOString(),
        };
      }

      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role as { id: string; name: string };
        session.user.branch =
          (token.branch as {
            id: string;
            name: string;
            code: string;
          } | null) ?? null;
        session.user.username = (token.username as string | null) ?? null;
        if (token.name) session.user.name = String(token.name);
        if (token.email) session.user.email = String(token.email);
      }
      return session;
    },
  },
};

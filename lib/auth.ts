import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const login = parsed.data.login;

        try {
          const user = await prisma.user.findFirst({
            where: {
              isActive: true,
              OR: [{ username: login }, { email: login }],
            },
            include: {
              role: true,
              branch: true,
            },
          });

          if (!user) {
            return null;
          }

          const isValidPassword = await compare(
            parsed.data.password,
            user.passwordHash,
          );

          if (!isValidPassword) {
            return null;
          }

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
        } catch (error) {
          console.error("[auth] login failed:", error);
          throw new Error("DATABASE_UNAVAILABLE");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.branch = user.branch;
        token.username = user.username ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.branch = token.branch;
        session.user.username = token.username ?? null;
      }

      return session;
    },
  },
};

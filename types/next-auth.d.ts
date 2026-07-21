import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: {
        id: string;
        name: string;
      };
      branch: {
        id: string;
        name: string;
        code: string;
      } | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: {
      id: string;
      name: string;
    };
    branch: {
      id: string;
      name: string;
      code: string;
    } | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: {
      id: string;
      name: string;
    };
    branch: {
      id: string;
      name: string;
      code: string;
    } | null;
  }
}

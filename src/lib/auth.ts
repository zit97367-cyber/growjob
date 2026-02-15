import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, resetRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/security";
import { verifyPassword } from "@/lib/password";

const providers = [];
let externalProviderCount = 0;

providers.push(
  CredentialsProvider({
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const password = credentials?.password ?? "";

      if (!email || !password) return null;

      const bucket = consumeRateLimit(`login:${email}`, 8, 10 * 60 * 1000);
      if (!bucket.allowed) return null;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, image: true, role: true, isPremium: true, passwordHash: true },
      });

      if (!user?.passwordHash) return null;

      let valid = false;
      try {
        valid = await verifyPassword(password, user.passwordHash);
      } catch {
        return null;
      }
      if (!valid) return null;

      resetRateLimit(`login:${email}`);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        isPremium: user.isPremium,
      };
    },
  }),
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  externalProviderCount += 1;
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  externalProviderCount += 1;
  providers.push(
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  );
}

const usingCredentialsFallback = externalProviderCount === 0;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: usingCredentialsFallback ? "jwt" : "database" },
  providers,
  callbacks: {
    async session({ session, user, token }) {
      const userId = user?.id ?? token?.sub;
      if (!userId) return session;

      if (session.user) {
        const fullUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { isPremium: true, role: true },
        });
        session.user.id = userId;
        session.user.isPremium = fullUser?.isPremium ?? false;
        session.user.role = (fullUser?.role ?? UserRole.USER) as UserRole;
      }
      return session;
    },
    async signIn({ user }) {
      if (isAdminEmail(user.email)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: UserRole.ADMIN },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: "/signin",
  },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

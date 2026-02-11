import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/security";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  );
}

if (providers.length === 0) {
  providers.push(
    CredentialsProvider({
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        if (!email) return null;
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: email.split("@")[0],
            role: isAdminEmail(email) ? UserRole.ADMIN : UserRole.USER,
          },
        });
        return user;
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const fullUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isPremium: true, role: true },
        });
        session.user.id = user.id;
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

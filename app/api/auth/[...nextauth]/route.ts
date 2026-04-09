import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Admin Login',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@mgjewelry.com'
        const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword'

        if (credentials.email === adminEmail && credentials.password === adminPassword) {
          return { id: 'admin-id', name: 'Admin', email: adminEmail, role: 'admin' }
        }
        
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
        if (user) {
            token.role = (user as any).role
        }
        return token
    },
    async session({ session, token }) {
        if (session.user) {
            (session.user as any).role = token.role
        }
        return session
    }
  },
  pages: {
    signIn: '/admin/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || 'fallback_secret_for_development_purposes',
})

export { handler as GET, handler as POST }

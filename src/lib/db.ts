import { PrismaClient } from '.prisma/client'

// Declare a global variable to hold the Prisma client instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Instantiate PrismaClient, reusing the instance in development
// or creating a new one in production
const prisma = global.prisma || new PrismaClient({
  // Optional: Log Prisma queries
  // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// In development, assign the instance to the global variable
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
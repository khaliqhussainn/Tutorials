// prisma/seed.ts - Optional seed file
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  // Create sample course
  const course = await prisma.course.upsert({
    where: { id: 'sample-course' },
    update: {},
    create: {
      id: 'sample-course',
      title: 'Introduction to Web Development',
      description: 'Learn the basics of web development with HTML, CSS, and JavaScript.',
      category: 'Programming',
      level: 'BEGINNER',
      isPublished: true,
    },
  })

  console.log({ admin, course })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

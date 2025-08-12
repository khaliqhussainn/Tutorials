// prisma/seed.ts - Updated with admin password
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Hash the admin password
  const adminPassword = await bcrypt.hash('admin123', 12)
  const testUserPassword = await bcrypt.hash('test123', 12)

  // Create admin user with password
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword, // Update password if user exists
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: adminPassword,
    },
  })

  // Create sample course
  const course = await prisma.course.create({
    data: {
      title: 'Introduction to Web Development',
      description: 'Learn the basics of web development with HTML, CSS, and JavaScript.',
      category: 'Programming',
      level: 'BEGINNER',
      isPublished: true,
    },
  })

  // Create a course section
  const section = await prisma.courseSection.create({
    data: {
      title: 'Getting Started',
      description: 'Introduction to web development fundamentals',
      order: 1,
      courseId: course.id,
    },
  })

  // Create sample videos
  const video1 = await prisma.video.create({
    data: {
      title: 'What is Web Development?',
      description: 'An overview of web development and what you will learn in this course.',
      videoUrl: 'https://example.com/video1.mp4',
      duration: 300, // 5 minutes
      order: 1,
      courseId: course.id,
      sectionId: section.id,
      aiPrompt: 'This video introduces web development concepts including HTML, CSS, and JavaScript basics. Students will learn about the role of web developers and the technologies they use.',
    },
  })

  const video2 = await prisma.video.create({
    data: {
      title: 'HTML Fundamentals',
      description: 'Learn the basics of HTML including tags, elements, and document structure.',
      videoUrl: 'https://example.com/video2.mp4',
      duration: 600, // 10 minutes
      order: 2,
      courseId: course.id,
      sectionId: section.id,
      aiPrompt: 'This video covers HTML fundamentals including basic tags (h1-h6, p, div, span), semantic elements (header, nav, main, footer), and document structure. Students will learn how to create well-structured web pages with proper HTML5 syntax.',
    },
  })

  // Create sample tests for the videos
  const test1 = await prisma.test.create({
    data: {
      videoId: video1.id,
      question: 'What are the three main technologies used in web development?',
      options: [
        'HTML, CSS, JavaScript',
        'Python, Java, C++',
        'React, Vue, Angular',
        'PHP, Ruby, Node.js'
      ],
      correct: 0,
      explanation: 'HTML provides structure, CSS handles styling, and JavaScript adds interactivity to web pages.',
      difficulty: 'easy',
    },
  })

  const test2 = await prisma.test.create({
    data: {
      videoId: video2.id,
      question: 'Which HTML tag is used to create the main heading of a page?',
      options: [
        '<header>',
        '<h1>',
        '<title>',
        '<main>'
      ],
      correct: 1,
      explanation: 'The <h1> tag represents the main heading of a page and is important for SEO and accessibility.',
      difficulty: 'easy',
    },
  })

  const test3 = await prisma.test.create({
    data: {
      videoId: video2.id,
      question: 'What does HTML stand for?',
      options: [
        'Hyper Text Markup Language',
        'High Tech Modern Language',
        'Home Tool Markup Language',
        'Hyperlink and Text Markup Language'
      ],
      correct: 0,
      explanation: 'HTML stands for HyperText Markup Language, which is the standard markup language for creating web pages.',
      difficulty: 'easy',
    },
  })

  // Create a regular user for testing with password
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      password: testUserPassword, // Update password if user exists
    },
    create: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      password: testUserPassword,
    },
  })

  // Enroll the test user in the course
  const enrollment = await prisma.enrollment.create({
    data: {
      userId: testUser.id,
      courseId: course.id,
    },
  })

  console.log('🌱 Seed data created successfully!')
  console.log('')
  console.log('👤 Admin Login Credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: admin123')
  console.log('')
  console.log('👤 Test User Login Credentials:')
  console.log('   Email: test@example.com')
  console.log('   Password: test123')
  console.log('')
  console.log('📊 Created Data:')
  console.log({
    admin: { id: admin.id, email: admin.email, role: admin.role },
    course: { id: course.id, title: course.title },
    section: { id: section.id, title: section.title },
    videos: [
      { id: video1.id, title: video1.title },
      { id: video2.id, title: video2.title }
    ],
    tests: [
      { id: test1.id, question: test1.question },
      { id: test2.id, question: test2.question },
      { id: test3.id, question: test3.question }
    ],
    testUser: { id: testUser.id, email: testUser.email },
    enrollment: { userId: enrollment.userId, courseId: enrollment.courseId }
  })
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
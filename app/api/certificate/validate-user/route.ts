import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma' // Your existing prisma instance
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Verify the request is from your certificate website
  const authHeader = req.headers.authorization
  const expectedSecret = `Bearer ${process.env.COURSE_WEBSITE_API_SECRET}`
  
  if (authHeader !== expectedSecret) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const { email, password } = req.body

    // Find user in your course website database
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Return user data (excluding sensitive fields)
    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      password: user.password // Pass hashed password for sync
    })

  } catch (error) {
    console.error('Validate user error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

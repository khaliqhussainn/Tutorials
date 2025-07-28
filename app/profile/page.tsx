// app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  User, 
  Mail, 
  Calendar, 
  Award, 
  BookOpen, 
  Clock, 
  Edit3,
  Save,
  X,
  Camera,
  Trophy,
  Target,
  TrendingUp
} from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface UserStats {
  totalEnrollments: number
  completedCourses: number
  inProgressCourses: number
  totalWatchTime: number
  favoriteCount: number
}

interface UserProfile {
  id: string
  name: string | null
  email: string
  image: string | null
  createdAt: string
  role: string
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserProfile()
      fetchUserStats()
    }
  }, [session])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data)
        setFormData({
          name: data.name || '',
          email: data.email || '',
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/course-stats')
      if (response.ok) {
        const data = await response.json()
        setUserStats(data)
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUserProfile(updatedUser)
        setIsEditing(false)
        
        // Update the session
        await update({
          ...session,
          user: {
            ...session?.user,
            name: formData.name,
          },
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: userProfile?.name || '',
      email: userProfile?.email || '',
    })
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                {userProfile?.image ? (
                  <img 
                    src={userProfile.image} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {userProfile?.name?.charAt(0) || userProfile?.email?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center hover:bg-primary-400 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">
                {userProfile?.name || 'User'}
              </h1>
              <p className="text-primary-100 mb-4">
                {userProfile?.email}
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center bg-white/10 rounded-lg px-3 py-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    Joined {new Date(userProfile?.createdAt || '').toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center bg-white/10 rounded-lg px-3 py-1">
                  <Award className="w-4 h-4 mr-2" />
                  <span className="text-sm capitalize">{userProfile?.role?.toLowerCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="text-center">
              <CardContent className="p-6">
                <BookOpen className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{userStats.totalEnrollments}</div>
                <div className="text-sm text-gray-600">Courses Enrolled</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{userStats.completedCourses}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{userStats.inProgressCourses}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {formatDuration(userStats.totalWatchTime)}
                </div>
                <div className="text-sm text-gray-600">Watch Time</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Profile Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Information
            </CardTitle>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {userProfile?.name || 'Not provided'}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  {userProfile?.email}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                <Award className="w-4 h-4 text-gray-400 mr-2" />
                <span className="capitalize">{userProfile?.role?.toLowerCase()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Progress */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Learning Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userStats && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Course Completion Rate</span>
                    <span className="text-sm text-gray-600">
                      {userStats.totalEnrollments > 0 
                        ? Math.round((userStats.completedCourses / userStats.totalEnrollments) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: userStats.totalEnrollments > 0 
                          ? `${(userStats.completedCourses / userStats.totalEnrollments) * 100}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {userStats.completedCourses}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {userStats.inProgressCourses}
                    </div>
                    <div className="text-xs text-gray-600">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {userStats.favoriteCount}
                    </div>
                    <div className="text-xs text-gray-600">Favorites</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
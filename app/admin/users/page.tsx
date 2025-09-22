// app/admin/users/page.tsx - Users Management Page
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Users,
  Search,
  Filter,
  Download,
  UserPlus,
  Mail,
  Calendar,
  Award,
  Eye,
  Edit,
  Shield,
  ShieldCheck,
  Clock,
  BookOpen,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserX,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
  lastLoginAt: string | null
  isActive: boolean
  _count: {
    enrollments: number
    completedCourses: number
  }
  totalWatchTime: number
  averageProgress: number
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  newUsersThisMonth: number
  totalEnrollments: number
  avgCompletionRate: number
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'USER' | 'ADMIN'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const usersPerPage = 10

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchUsers()
    fetchUserStats()
  }, [session, router])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, filterRole, filterStatus])

  const fetchUsers = async () => {
    try {
      setError('')
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        setError('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const filterUsers = () => {
    let filtered = users
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole)
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user =>
        filterStatus === 'active' ? user.isActive : !user.isActive
      )
    }
    setFilteredUsers(filtered)
    setCurrentPage(1)
  }

  const toggleUserRole = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      if (response.ok) {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, role: newRole as 'USER' | 'ADMIN' } : user
          )
        )
        setSuccess(`User role updated to ${newRole}`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update user role')
      }
    } catch (error) {
      setError('Failed to update user role')
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      })
      if (response.ok) {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, isActive: newStatus } : user
          )
        )
        setSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update user status')
      }
    } catch (error) {
      setError('Failed to update user status')
    }
  }

  const exportUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      setError('Failed to export users')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getRoleIcon = (role: string) => {
    return role === 'ADMIN' ? <ShieldCheck className="w-4 h-4 text-[#001e62]" /> : <Shield className="w-4 h-4 text-gray-500" />
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />
  }

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#001e62] mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                User Management
              </h1>
              <p className="text-lg text-gray-600">
                Manage all users, roles, and permissions on your platform.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button onClick={exportUsers} variant="outline" className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button className="flex items-center bg-[#001e62] hover:bg-[#001e62]/90">
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.activeUsers}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <ShieldCheck className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.adminUsers}</div>
                  <div className="text-sm text-gray-600">Admins</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.newUsersThisMonth}</div>
                  <div className="text-sm text-gray-600">New This Month</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <BookOpen className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.totalEnrollments}</div>
                  <div className="text-sm text-gray-600">Enrollments</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Award className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.avgCompletionRate}%</div>
                  <div className="text-sm text-gray-600">Avg Completion</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Role Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001e62]"
                >
                  <option value="all">All Roles</option>
                  <option value="USER">Users</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001e62]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Users ({filteredUsers.length})</span>
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {currentUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Enrollments</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Progress</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Joined</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#001e62] rounded-full flex items-center justify-center text-white font-semibold">
                              {user.name?.charAt(0) || user.email.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {user.name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'ADMIN'
                                ? 'bg-[#001e62]/10 text-[#001e62]'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(user.isActive)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <div className="font-medium">{user._count.enrollments}</div>
                            <div className="text-gray-500">{user._count.completedCourses} completed</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <div className="font-medium">{user.averageProgress}%</div>
                            <div className="text-gray-500">{formatDuration(user.totalWatchTime)}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserRole(user.id, user.role)}
                              className="text-xs"
                            >
                              {user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserStatus(user.id, user.isActive)}
                              className={`text-xs ${
                                user.isActive
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Link href={`/admin/users/${user.id}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No users found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

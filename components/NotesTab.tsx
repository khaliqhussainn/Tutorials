// components/NotesTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  Clock, 
  Save,
  Loader2,
  MessageSquare,
  Calendar,
  Play,
  Edit3
} from 'lucide-react'

interface Note {
  id: string
  content: string
  timestamp: number | null
  createdAt: string
  updatedAt: string
}

interface NotesTabProps {
  videoId: string
  currentTime: number
  videoDuration: number
  onSeekTo: (time: number) => void
}

export function NotesTab({ videoId, currentTime, videoDuration, onSeekTo }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchNotes()
  }, [videoId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/videos/${videoId}/notes`)
      
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      } else {
        console.error('Failed to fetch notes')
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveNote = async () => {
    if (!newNote.trim()) return

    try {
      setSaving(true)
      setError('')
      
      const response = await fetch(`/api/videos/${videoId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote.trim(),
          timestamp: Math.floor(currentTime)
        })
      })

      if (response.ok) {
        const data = await response.json()
        setNotes(prev => [data.note, ...prev])
        setNewNote('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save note')
      }
    } catch (error) {
      setError('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/videos/${videoId}/notes?noteId=${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))
      } else {
        setError('Failed to delete note')
      }
    } catch (error) {
      setError('Failed to delete note')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add New Note */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="bg-blue-50/50 border-b border-blue-100">
          <CardTitle className="flex items-center text-blue-900">
            <Plus className="w-5 h-5 mr-2" />
            Add Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
              <Edit3 className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center text-blue-700 bg-blue-100/80 px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4 mr-2" />
                Current time: {formatTime(currentTime)}
              </span>
              <span className="text-gray-500">Note will be linked to this timestamp</span>
            </div>
            
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write your note here... (e.g., 'Important concept about variables', 'Remember this technique', etc.)"
              className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px]"
              rows={4}
            />
            
            <Button 
              onClick={saveNote}
              disabled={!newNote.trim() || saving}
              className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Note...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Note at {formatTime(currentTime)}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center text-gray-900">
              <StickyNote className="w-5 h-5 mr-2" />
              Your Notes
            </div>
            <span className="text-sm font-medium bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notes.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {notes.map((note, index) => (
                <div
                  key={note.id}
                  className="p-6 hover:bg-gray-50/80 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {note.timestamp !== null && (
                        <button
                          onClick={() => onSeekTo(note.timestamp!)}
                          className="flex items-center text-xs font-mono bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-full transition-colors group/btn"
                          title={`Jump to ${formatTime(note.timestamp)}`}
                        >
                          <Play className="w-3 h-3 mr-1.5 group-hover/btn:scale-110 transition-transform" />
                          {formatTime(note.timestamp)}
                        </button>
                      )}
                      <span className="text-xs text-gray-500 flex items-center bg-gray-100/80 px-2.5 py-1 rounded-full">
                        <Calendar className="w-3 h-3 mr-1.5" />
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Notes Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start taking notes to remember important points from this video. Your notes will be saved with timestamps so you can easily jump back to specific moments.
              </p>
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2 text-blue-700 mb-3">
                  <StickyNote className="w-5 h-5" />
                  <span className="font-medium">Pro Tips:</span>
                </div>
                <ul className="text-blue-600 text-sm space-y-2 text-left">
                  <li className="flex items-start">
                    <Clock className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    Notes are automatically timestamped
                  </li>
                  <li className="flex items-start">
                    <Play className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    Click timestamps to jump back to that moment
                  </li>
                  <li className="flex items-start">
                    <Edit3 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    Perfect for highlighting key concepts
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
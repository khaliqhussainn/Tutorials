// Enhanced Notes Tab Component for video page
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  StickyNote, 
  Save, 
  Clock, 
  Trash2, 
  Edit3, 
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface VideoNote {
  id: string
  content: string
  timestamp: number | null
  createdAt: string
  updatedAt: string
}

interface NotesTabProps {
  videoId: string
  currentTime: number // Current video playback time
  videoDuration: number
  onSeekTo: (time: number) => void // Function to seek video to specific time
}

export function NotesTab({ videoId, currentTime, videoDuration, onSeekTo }: NotesTabProps) {
  const [notes, setNotes] = useState<VideoNote[]>([])
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch existing notes on component mount
  useEffect(() => {
    fetchNotes()
  }, [videoId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/videos/${videoId}/notes`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.notes) {
          setNotes(data.notes)
        }
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveNote = async (content: string, timestamp: number | null = null) => {
    if (!content.trim()) return

    try {
      setSaving(true)
      const response = await fetch(`/api/videos/${videoId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: content.trim(),
          timestamp: timestamp
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Refresh notes list
          await fetchNotes()
          setNewNoteContent('')
        }
      }
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateNote = async (noteId: string, content: string, timestamp: number | null) => {
    if (!content.trim()) return

    try {
      setSaving(true)
      const response = await fetch(`/api/videos/${videoId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          noteId,
          content: content.trim(),
          timestamp
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Refresh notes list
          await fetchNotes()
          setEditingNote(null)
          setEditContent('')
        }
      }
    } catch (error) {
      console.error('Error updating note:', error)
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
        const data = await response.json()
        if (data.success) {
          // Refresh notes list
          await fetchNotes()
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const handleSaveNote = () => {
    saveNote(newNoteContent, currentTime)
  }

  const handleSaveGeneralNote = () => {
    saveNote(newNoteContent, null)
  }

  const handleEditNote = (note: VideoNote) => {
    setEditingNote(note.id)
    setEditContent(note.content)
  }

  const handleUpdateNote = (note: VideoNote) => {
    updateNote(note.id, editContent, note.timestamp)
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditContent('')
  }

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        newSet.add(noteId)
      }
      return newSet
    })
  }

  const sortedNotes = [...notes].sort((a, b) => {
    // Sort by timestamp (null timestamps go to end), then by creation date
    if (a.timestamp === null && b.timestamp === null) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    if (a.timestamp === null) return 1
    if (b.timestamp === null) return -1
    return a.timestamp - b.timestamp
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#001e62] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your notes...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add New Note Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add New Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <textarea
              ref={textareaRef}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add your note here..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#001e62] focus:border-transparent"
              disabled={saving}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Current time: {formatDuration(currentTime)}
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={handleSaveGeneralNote}
                variant="outline"
                disabled={!newNoteContent.trim() || saving}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Save as General Note
              </Button>
              
              <Button
                onClick={handleSaveNote}
                disabled={!newNoteContent.trim() || saving}
                className="bg-[#001e62] hover:bg-[#001e62]/90"
              >
                <Clock className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : `Save at ${formatDuration(currentTime)}`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <StickyNote className="w-5 h-5 mr-2" />
              My Notes ({notes.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <StickyNote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-600">
                Start taking notes to keep track of important points in this video.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedNotes.map((note) => (
                <div
                  key={note.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    note.timestamp !== null ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {note.timestamp !== null ? (
                        <Badge 
                          className="bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors"
                          onClick={() => onSeekTo(note.timestamp!)}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDuration(note.timestamp)}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          General
                        </Badge>
                      )}
                      
                      <span className="text-xs text-gray-500">
                        {new Date(note.createdAt).toLocaleDateString()} at{' '}
                        {new Date(note.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleEditNote(note)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => deleteNote(note.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {editingNote === note.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#001e62] focus:border-transparent"
                        disabled={saving}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleUpdateNote(note)}
                          size="sm"
                          disabled={!editContent.trim() || saving}
                          className="bg-[#001e62] hover:bg-[#001e62]/90"
                        >
                          {saving ? 'Saving...' : 'Update Note'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div 
                        className={`text-gray-700 leading-relaxed ${
                          note.content.length > 200 && !expandedNotes.has(note.id) 
                            ? 'line-clamp-3' 
                            : ''
                        }`}
                      >
                        {note.content}
                      </div>
                      
                      {note.content.length > 200 && (
                        <button
                          onClick={() => toggleNoteExpansion(note.id)}
                          className="flex items-center mt-2 text-sm text-[#001e62] hover:text-[#001e62]/80"
                        >
                          {expandedNotes.has(note.id) ? (
                            <>
                              Show less <ChevronUp className="w-4 h-4 ml-1" />
                            </>
                          ) : (
                            <>
                              Show more <ChevronDown className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Summary */}
      {notes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#001e62]">
                  {notes.filter(n => n.timestamp !== null).length}
                </div>
                <div className="text-sm text-gray-600">Timestamped Notes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#001e62]">
                  {notes.filter(n => n.timestamp === null).length}
                </div>
                <div className="text-sm text-gray-600">General Notes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#001e62]">
                  {notes.length}
                </div>
                <div className="text-sm text-gray-600">Total Notes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
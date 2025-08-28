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
  Edit3,
  Search,
  Filter,
  ChevronDown,
  Bookmark,
  X
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
  const [customTime, setCustomTime] = useState('')
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'timestamp'>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [videoId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/videos/${videoId}/notes`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Handle both single note (legacy) and multiple notes format
        if (data.notes && Array.isArray(data.notes)) {
          setNotes(data.notes)
        } else if (data.content) {
          // Legacy format - single note
          const legacyNote: Note = {
            id: 'legacy',
            content: data.content,
            timestamp: data.timestamp || null,
            createdAt: data.updatedAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          }
          setNotes([legacyNote])
        } else {
          setNotes([])
        }
      } else {
        console.error('Failed to fetch notes')
        setNotes([])
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }

  const parseTimeInput = (timeStr: string): number | null => {
    if (!timeStr.trim()) return null;
    
    const parts = timeStr.split(':').map(part => parseInt(part.trim()));
    
    if (parts.length === 1 && !isNaN(parts[0])) {
      return Math.max(0, Math.min(parts[0], videoDuration));
    } else if (parts.length === 2 && parts.every(p => !isNaN(p))) {
      const totalSeconds = parts[0] * 60 + parts[1];
      return Math.max(0, Math.min(totalSeconds, videoDuration));
    } else if (parts.length === 3 && parts.every(p => !isNaN(p))) {
      const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      return Math.max(0, Math.min(totalSeconds, videoDuration));
    }
    
    return null;
  };

  const saveNote = async () => {
    if (!newNote.trim()) return

    try {
      setSaving(true)
      setError('')
      
      let timestamp = null;
      
      if (useCustomTime && customTime) {
        timestamp = parseTimeInput(customTime);
        if (timestamp === null) {
          setError('Invalid time format. Use formats like: 90 (seconds), 1:30 (mm:ss), or 1:05:30 (hh:mm:ss)');
          setSaving(false);
          return;
        }
      } else {
        timestamp = Math.floor(currentTime);
      }
      
      const response = await fetch(`/api/videos/${videoId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote.trim(),
          timestamp: timestamp
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add the new note to the beginning of the array
        if (data.note) {
          setNotes(prev => [data.note, ...prev])
          setNewNote('')
          setCustomTime('')
          setUseCustomTime(false)
          setShowAddNote(false)
        } else {
          setError('Failed to create note - invalid response')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save note')
      }
    } catch (error) {
      console.error('Error saving note:', error)
      setError('Failed to save note - network error')
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
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      setError('Failed to delete note - network error')
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  const filteredAndSortedNotes = notes
    .filter(note => 
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'timestamp':
          if (a.timestamp === null && b.timestamp === null) return 0;
          if (a.timestamp === null) return 1;
          if (b.timestamp === null) return -1;
          return a.timestamp - b.timestamp;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#001e62]" />
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* Add New Note Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowAddNote(true)}
          className="bg-[#001e62] hover:bg-[#001e62]/90 text-white shadow-lg hover:shadow-xl"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Note
        </Button>
      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-[#001e62] text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center text-lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Note
                </h3>
                <button
                  onClick={() => {
                    setShowAddNote(false)
                    setError('')
                    setNewNote('')
                    setCustomTime('')
                    setUseCustomTime(false)
                  }}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start">
                  <Edit3 className="w-4 h-4 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error saving note</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}
              
              {/* Timestamp Selection */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-[#001e62]" />
                  Timestamp Options
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="timeOption"
                        checked={!useCustomTime}
                        onChange={() => setUseCustomTime(false)}
                        className="w-4 h-4 text-[#001e62] focus:ring-[#001e62] focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Use current video time</span>
                    </label>
                    <div className="flex items-center text-[#001e62] bg-[#001e62]/10 px-4 py-2 rounded-full">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="font-mono font-semibold">{formatTime(Math.floor(currentTime))}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="timeOption"
                        checked={useCustomTime}
                        onChange={() => setUseCustomTime(true)}
                        className="w-4 h-4 text-[#001e62] focus:ring-[#001e62] focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Set custom time</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="1:30 or 1:05:30"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      disabled={!useCustomTime}
                      className="w-40 font-mono focus:ring-[#001e62] focus:border-[#001e62] disabled:bg-gray-100"
                    />
                  </div>
                  
                  <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium mb-2 text-blue-800">Supported formats:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-blue-700">
                      <div>• <code className="bg-white px-2 py-1 rounded font-mono text-xs">90</code> - 90 seconds</div>
                      <div>• <code className="bg-white px-2 py-1 rounded font-mono text-xs">1:30</code> - 1 min 30 sec</div>
                      <div>• <code className="bg-white px-2 py-1 rounded font-mono text-xs">1:05:30</code> - 1 hr 5 min 30 sec</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Note Content
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your note here...

Examples:
• 'Important concept about state management - need to review'
• 'Great explanation of useEffect dependencies'  
• 'Remember this optimization technique for large apps'"
                  className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] transition-all min-h-[140px] text-sm leading-relaxed"
                  rows={6}
                />
              </div>
              
              <div className="flex space-x-4">
                <Button
                  onClick={() => {
                    setShowAddNote(false)
                    setError('')
                    setNewNote('')
                    setCustomTime('')
                    setUseCustomTime(false)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveNote}
                  disabled={!newNote.trim() || saving}
                  className="flex-1 bg-[#001e62] hover:bg-[#001e62]/90 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Note
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <Card className="shadow-lg border border-gray-200 overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                <StickyNote className="w-6 h-6 mr-3 text-[#001e62]" />
                Your Notes
                <span className="ml-3 text-sm font-semibold bg-[#001e62] text-white px-3 py-1.5 rounded-full">
                  {notes.length}
                </span>
              </CardTitle>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 w-56 focus:ring-[#001e62] focus:border-[#001e62]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="relative">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2 border-gray-300 hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  <span>Sort</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                    {[
                      { value: 'newest', label: 'Newest First' },
                      { value: 'oldest', label: 'Oldest First' },
                      { value: 'timestamp', label: 'By Video Time' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as typeof sortBy);
                          setShowFilters(false);
                        }}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                          sortBy === option.value ? 'bg-[#001e62] text-white' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredAndSortedNotes.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredAndSortedNotes.map((note, index) => (
                <div
                  key={note.id}
                  className="p-6 hover:bg-gray-50/80 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-wrap gap-2">
                      {note.timestamp !== null && (
                        <Button
                          onClick={() => onSeekTo(note.timestamp!)}
                          size="sm"
                          className="bg-[#001e62] hover:bg-[#001e62]/90 text-white shadow-sm group/btn font-mono text-xs"
                          title={`Jump to ${formatTime(note.timestamp)}`}
                        >
                          <Play className="w-3 h-3 mr-2 group-hover/btn:scale-110 transition-transform" />
                          {formatTime(note.timestamp)}
                        </Button>
                      )}
                      <span className="text-xs text-gray-500 flex items-center bg-gray-100 px-3 py-1.5 rounded-full">
                        <Calendar className="w-3 h-3 mr-2" />
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-200/50">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {searchQuery ? (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: note.content.replace(
                              new RegExp(`(${searchQuery})`, "gi"),
                              '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                            ),
                          }}
                        />
                      ) : (
                        note.content
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                {searchQuery ? 'No matching notes found' : 'No Notes Yet'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto text-lg">
                {searchQuery 
                  ? 'Try adjusting your search terms or clear the search to see all notes.'
                  : 'Start taking notes to remember important points from this video. Your notes will be saved with timestamps so you can easily jump back to specific moments.'
                }
              </p>
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  className="text-[#001e62] border-[#001e62] hover:bg-[#001e62]/10"
                >
                  Clear search
                </Button>
              )}
              {!searchQuery && (
                <div className="bg-[#001e62]/5 border border-[#001e62]/20 rounded-xl p-8 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center space-x-2 text-[#001e62] mb-6">
                    <Bookmark className="w-6 h-6" />
                    <span className="font-bold text-lg">Pro Tips:</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-[#001e62]/80 text-sm">
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Auto timestamps</p>
                        <p className="text-xs">Notes saved with current video time</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Edit3 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Custom times</p>
                        <p className="text-xs">Set specific timestamps manually</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Play className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Quick navigation</p>
                        <p className="text-xs">Click timestamps to jump to moments</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// components/AISettingsPanel.tsx - Settings panel for AI preferences
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Switch } from "@/components/ui/Switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { Settings, Brain, Volume2, Zap } from "lucide-react"

interface AISettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  preferences: any
  onUpdatePreferences: (prefs: any) => void
}

export function AISettingsPanel({ 
  isOpen, 
  onClose, 
  preferences, 
  onUpdatePreferences 
}: AISettingsPanelProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences)

  if (!isOpen) return null

  const handleSave = () => {
    onUpdatePreferences(localPrefs)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            AI Learning Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>Auto-generate notes</span>
            </div>
            <Switch
              checked={localPrefs.autoGenerateNotes}
              onCheckedChange={(checked) =>
                setLocalPrefs(prev => ({ ...prev, autoGenerateNotes: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <span>Enable voice features</span>
            </div>
            <Switch
              checked={localPrefs.enableVoice}
              onCheckedChange={(checked) =>
                setLocalPrefs(prev => ({ ...prev, enableVoice: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Response speed</span>
            </div>
            <Select
              value={localPrefs.responseSpeed}
              onValueChange={(value) =>
                setLocalPrefs(prev => ({ ...prev, responseSpeed: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Slow & Detailed</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fast">Fast & Concise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
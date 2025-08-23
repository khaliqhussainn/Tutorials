// components/admin/TranscriptManager.tsx
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  FileText,
  Download,
  RefreshCw,
  Trash2,
  PlayCircle,
  PauseCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Languages,
  Volume2,
  Eye,
  EyeOff,
  Copy,
  Search,
} from "lucide-react";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

interface Transcript {
  id: string;
  videoId: string;
  content: string;
  language: string;
  segments?: TranscriptSegment[];
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  error?: string;
  generatedAt?: string;
  confidence?: number;
  provider?: string;
}

interface TranscriptManagerProps {
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  onTranscriptGenerated?: (transcript: Transcript) => void;
}

export default function TranscriptManager({
  videoId,
  videoUrl,
  videoTitle,
  onTranscriptGenerated,
}: TranscriptManagerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [generationSettings, setGenerationSettings] = useState({
    language: "en",
    includeTimestamps: true,
    regenerate: false,
  });

  const hasOpenAI = process.env.NEXT_PUBLIC_HAS_OPENAI === "true";
  const hasAssemblyAI = process.env.NEXT_PUBLIC_HAS_ASSEMBLYAI === "true";

  const hasAnyProvider = hasAssemblyAI || hasOpenAI;

  useEffect(() => {
    fetchTranscript();
  }, [videoId]);

  const fetchTranscript = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(`/api/admin/videos/${videoId}/transcript`);

      if (response.ok) {
        const data = await response.json();
        if (data.hasTranscript) {
          setTranscript({
            id: data.videoId,
            videoId: data.videoId,
            content: data.transcript || "",
            language: data.language || "en",
            segments: data.segments || [],
            status: data.status || "PENDING",
            confidence: data.confidence,
            provider: data.provider,
            generatedAt: new Date().toISOString(),
          });
        } else {
          setTranscript(null);
        }
      } else if (response.status === 404) {
        setTranscript(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch transcript");
      }
    } catch (error) {
      console.error("Error fetching transcript:", error);
      setError("Failed to fetch transcript");
    } finally {
      setIsLoading(false);
    }
  };

  const generateTranscript = async () => {
    if (!hasOpenAI) {
      setError("OpenAI integration is not configured");
      return;
    }
    try {
      setIsGenerating(true);
      setError("");
      setSuccess("");
      const response = await fetch(`/api/admin/videos/${videoId}/transcript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl,
          ...generationSettings,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setTranscript({
          id: videoId,
          videoId: videoId,
          content: data.transcript?.transcript || data.transcript || "",
          language: data.language || "en",
          segments: data.segments || [],
          status: "COMPLETED",
          confidence: data.confidence,
          provider: data.provider,
          generatedAt: new Date().toISOString(),
        });
        setSuccess("Transcript generated successfully!");
        onTranscriptGenerated?.(transcript!);
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.error || "Failed to generate transcript");
      }
    } catch (error) {
      console.error("Error generating transcript:", error);
      setError("Failed to generate transcript");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteTranscript = async () => {
    if (!confirm("Are you sure you want to delete this transcript?")) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/videos/${videoId}/transcript`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTranscript(null);
        setSuccess("Transcript deleted successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete transcript");
      }
    } catch (error) {
      console.error("Error deleting transcript:", error);
      setError("Failed to delete transcript");
    }
  };

  const downloadTranscript = () => {
    if (!transcript) return;
    const content = transcript.content;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${videoTitle
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyTranscript = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript.content);
      setSuccess("Transcript copied to clipboard!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Failed to copy transcript");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusIcon = () => {
    if (!transcript) return null;
    switch (transcript.status) {
      case "COMPLETED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "PROCESSING":
      case "PENDING":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case "FAILED":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    if (!transcript) return "text-gray-500";
    switch (transcript.status) {
      case "COMPLETED":
        return "text-green-600";
      case "PROCESSING":
      case "PENDING":
        return "text-blue-600";
      case "FAILED":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  const filteredSegments =
    transcript?.segments?.filter((segment) =>
      segment.text.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading transcript...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Main Transcript Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Video Transcript
              {getStatusIcon() && (
                <span className="ml-2">{getStatusIcon()}</span>
              )}
            </CardTitle>

            {transcript && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={copyTranscript}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTranscript}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteTranscript}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!transcript ? (
            // No transcript exists - show generation form
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No transcript available
              </h3>

              {!hasAnyProvider ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    No transcript provider configured. Please add
                    ASSEMBLYAI_API_KEY or OPENAI_API_KEY to enable transcript
                    generation.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-500 mb-6">
                    Generate an AI-powered transcript for this video using
                    OpenAI Whisper.
                  </p>

                  {/* Generation Settings */}
                  <div className="max-w-md mx-auto space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Language
                        </label>
                        <select
                          value={generationSettings.language}
                          onChange={(e) =>
                            setGenerationSettings((prev) => ({
                              ...prev,
                              language: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          disabled={isGenerating}
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                          <option value="ru">Russian</option>
                          <option value="ja">Japanese</option>
                          <option value="ko">Korean</option>
                          <option value="zh">Chinese</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={generationSettings.includeTimestamps}
                            onChange={(e) =>
                              setGenerationSettings((prev) => ({
                                ...prev,
                                includeTimestamps: e.target.checked,
                              }))
                            }
                            className="mr-2"
                            disabled={isGenerating}
                          />
                          <span className="text-sm text-gray-700">
                            Include timestamps
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start">
                        <Volume2 className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium mb-1">
                            AI Transcript Features:
                          </p>
                          <ul className="space-y-1">
                            <li>• High accuracy speech recognition</li>
                            <li>• Automatic punctuation and formatting</li>
                            <li>• Support for multiple languages</li>
                            <li>• Optional timestamp segments</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={generateTranscript}
                    disabled={isGenerating}
                    className="min-w-48"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Transcript...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate AI Transcript
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          ) : (
            // Transcript exists - show content and management
            <div className="space-y-4">
              {/* Transcript Status and Info */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${getStatusColor()}`}>
                      Status: {transcript.status}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Languages className="w-4 h-4 mr-1" />
                    {transcript.language.toUpperCase()}
                  </div>

                  {transcript.generatedAt && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      Generated{" "}
                      {new Date(transcript.generatedAt).toLocaleDateString()}
                    </div>
                  )}

                  {transcript.segments && (
                    <div className="text-sm text-gray-600">
                      {transcript.segments.length} segments
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGenerationSettings((prev) => ({
                      ...prev,
                      regenerate: true,
                    }));
                    generateTranscript();
                  }}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
              </div>

              {/* Error Display */}
              {transcript.status === "FAILED" && transcript.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {transcript.error}
                  </p>
                </div>
              )}

              {/* Transcript Content */}
              {transcript.status === "COMPLETED" && transcript.content && (
                <div className="space-y-4">
                  {/* Search and View Toggle */}
                  {transcript.segments && transcript.segments.length > 0 && (
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search transcript..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowFullTranscript(!showFullTranscript)
                        }
                      >
                        {showFullTranscript ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Show Segments
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Show Full Text
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Transcript Display */}
                  <div className="border border-gray-200 rounded-lg">
                    {showFullTranscript || !transcript.segments ? (
                      // Full transcript view
                      <div className="p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                          {transcript.content}
                        </pre>
                      </div>
                    ) : (
                      // Segmented view with timestamps
                      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                        {(searchTerm
                          ? filteredSegments
                          : transcript.segments
                        ).map((segment, index) => (
                          <div
                            key={index}
                            className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                              currentSegment === index
                                ? "bg-blue-50 border-l-4 border-blue-500"
                                : ""
                            }`}
                            onClick={() =>
                              setCurrentSegment(
                                currentSegment === index ? null : index
                              )
                            }
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <span className="text-xs font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  {formatTime(segment.start)}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  {searchTerm ? (
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: segment.text.replace(
                                          new RegExp(searchTerm, "gi"),
                                          (match) =>
                                            `<mark class="bg-yellow-200">${match}</mark>`
                                        ),
                                      }}
                                    />
                                  ) : (
                                    segment.text
                                  )}
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-xs text-gray-400">
                                {formatTime(segment.end - segment.start)}
                              </div>
                            </div>
                          </div>
                        ))}

                        {searchTerm && filteredSegments.length === 0 && (
                          <div className="p-8 text-center text-gray-500">
                            <Search className="w-8 h-8 mx-auto mb-2" />
                            <p>No matches found for "{searchTerm}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Transcript Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="text-gray-600">Characters:</span>
                      <span className="ml-1 font-medium">
                        {transcript.content.length.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Words:</span>
                      <span className="ml-1 font-medium">
                        {transcript.content
                          .split(/\s+/)
                          .length.toLocaleString()}
                      </span>
                    </div>
                    {transcript.segments && (
                      <div>
                        <span className="text-gray-600">Segments:</span>
                        <span className="ml-1 font-medium">
                          {transcript.segments.length}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Language:</span>
                      <span className="ml-1 font-medium">
                        {transcript.language.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Status */}
      {transcript &&
        (transcript.status === "PROCESSING" ||
          transcript.status === "PENDING") && (
          <Card>
            <CardContent className="p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {transcript.status === "PROCESSING"
                  ? "Processing Audio..."
                  : "Queued for Processing..."}
              </h3>
              <p className="text-gray-500">
                AI is analyzing the video audio and generating the transcript.
                This may take a few minutes.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

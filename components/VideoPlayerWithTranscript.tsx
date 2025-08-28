"use client";

import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  Lock,
  FileText,
  Download,
  Search,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minimize,
  FastForward,
  Rewind,
  Monitor,
  Expand,
  X,
  Shrink
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

interface VideoPlayerWithTranscriptProps {
  videoUrl: string;
  title: string;
  videoId: string;
  onProgress: (progress: { played: number; playedSeconds: number }) => void;
  onEnded: () => void;
  canWatch: boolean;
  initialTime?: number;
}

export interface VideoPlayerRef {
  seekTo: (time: number, type?: "seconds" | "fraction") => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

const VideoPlayerWithTranscript = forwardRef<
  VideoPlayerRef,
  VideoPlayerWithTranscriptProps
>(
  (
    {
      videoUrl,
      title,
      videoId,
      onProgress,
      onEnded,
      canWatch,
      initialTime = 0,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);

    // Video player state
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [buffered, setBuffered] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    // Transcript state
    const [transcript, setTranscript] = useState<{
      content: string;
      segments: TranscriptSegment[];
      status: string;
    } | null>(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [activeSegment, setActiveSegment] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredTranscript, setFilteredTranscript] = useState<
      TranscriptSegment[]
    >([]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      seekTo: (time: number, type: "seconds" | "fraction" = "seconds") => {
        if (!videoRef.current) return;

        if (type === "seconds") {
          videoRef.current.currentTime = time;
        } else {
          videoRef.current.currentTime = time * duration;
        }
        setCurrentTime(videoRef.current.currentTime);
      },
      getCurrentTime: () => currentTime,
      getDuration: () => duration,
    }));

    // Fetch transcript data
    useEffect(() => {
      if (videoId && canWatch) {
        fetchTranscript();
      }
    }, [videoId, canWatch]);

    const fetchTranscript = async () => {
      try {
        setTranscriptLoading(true);
        const response = await fetch(`/api/videos/${videoId}/transcript`);

        if (response.ok) {
          const data = await response.json();

          if (data.hasTranscript && data.transcript) {
            const segments = Array.isArray(data.segments) ? data.segments : [];
            setTranscript({
              content: data.transcript,
              segments: segments,
              status: data.status,
            });
            setFilteredTranscript(segments);
          } else {
            setTranscript(null);
          }
        }
      } catch (error) {
        console.error("Error fetching transcript:", error);
      } finally {
        setTranscriptLoading(false);
      }
    };

    // Filter transcript based on search
    useEffect(() => {
      if (!transcript) return;

      if (searchQuery.trim() === "") {
        setFilteredTranscript(transcript.segments);
      } else {
        const filtered = transcript.segments.filter((segment) =>
          segment.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredTranscript(filtered);
      }
    }, [searchQuery, transcript]);

    // Update active segment based on current time
    useEffect(() => {
      if (!transcript?.segments) return;

      const currentSegment = transcript.segments.findIndex(
        (segment) => currentTime >= segment.start && currentTime <= segment.end
      );

      setActiveSegment(currentSegment >= 0 ? currentSegment : null);

      // Auto-scroll to active segment
      if (currentSegment >= 0 && transcriptRef.current) {
        const segmentElement = transcriptRef.current.querySelector(
          `[data-segment-id="${currentSegment}"]`
        );
        if (segmentElement) {
          segmentElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }, [currentTime, transcript]);

    // Video player effects and handlers
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        const current = video.currentTime;
        setCurrentTime(current);
        onProgress({
          played: current / video.duration,
          playedSeconds: current,
        });

        if (video.buffered.length > 0) {
          setBuffered(video.buffered.end(video.buffered.length - 1));
        }
      };

      const handleLoadedMetadata = () => {
        setDuration(video.duration);
        if (initialTime > 0) {
          video.currentTime = initialTime;
          setCurrentTime(initialTime);
        }
      };

      const handleEnded = () => {
        setPlaying(false);
        onEnded();
      };

      const handlePlay = () => setPlaying(true);
      const handlePause = () => setPlaying(false);

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("ended", handleEnded);
      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
      };
    }, [onProgress, onEnded, initialTime]);

    const togglePlay = () => {
      if (!videoRef.current) return;

      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
    };

    const seekToTime = (time: number) => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    };

    const changePlaybackRate = (rate: number) => {
      if (!videoRef.current) return;
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    };

    const toggleTranscript = () => {
      setShowTranscript(!showTranscript);
    };

    const downloadTranscript = () => {
      if (!transcript?.content) return;

      const blob = new Blob([transcript.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const formatTime = (time: number) => {
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    if (!canWatch) {
      return (
        <div className="w-full">
          <div className="w-full aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-[#001e62]/20 to-[#001e62]/40"></div>

            <div className="text-center max-w-md p-8 relative z-10">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 border border-white/20">
                <Lock className="w-10 h-10 text-white/80" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Complete Previous Lectures
              </h3>
              <p className="text-gray-300 leading-relaxed">
                You need to complete previous lectures and pass their quizzes to
                unlock this content.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full flex gap-4">
        {/* Video Player */}
        <div className={`${showTranscript ? 'flex-1' : 'w-full'} transition-all duration-300`}>
          <div
            ref={containerRef}
            className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden group cursor-pointer shadow-2xl"
            onMouseEnter={() => setShowControls(true)}
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onClick={togglePlay}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain bg-gray-900"
              preload="metadata"
            />

            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              {!playing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="w-20 h-20 md:w-24 md:h-24 bg-white/95 hover:bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-all duration-200 shadow-2xl border-4 border-white/20"
                  >
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-gray-900 ml-1" />
                  </button>
                </div>
              )}

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 space-y-3 md:space-y-4">
                {/* Progress Bar */}
                <div className="flex items-center space-x-3 md:space-x-4">
                  <span className="text-white text-sm md:text-base font-mono min-w-[50px]">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={duration ? (currentTime / duration) * 100 : 0}
                      onChange={(e) => {
                        if (!videoRef.current) return;
                        const time =
                          (parseFloat(e.target.value) / 100) * duration;
                        videoRef.current.currentTime = time;
                        setCurrentTime(time);
                      }}
                      className="w-full h-2 md:h-3 bg-white/20 rounded-lg appearance-none cursor-pointer hover:h-3 md:hover:h-4 transition-all"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: `linear-gradient(to right, #001e62 0%, #001e62 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.2) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                  </div>
                  <span className="text-white text-sm md:text-base font-mono min-w-[50px]">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                      className="text-white hover:bg-white/20 transition-colors p-2 md:p-3 rounded-full"
                    >
                      {playing ? (
                        <Pause className="w-6 h-6 md:w-7 md:h-7" />
                      ) : (
                        <Play className="w-6 h-6 md:w-7 md:h-7" />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current) {
                          videoRef.current.currentTime = Math.max(
                            0,
                            currentTime - 10
                          );
                        }
                      }}
                      className="text-white hover:bg-white/20 transition-colors p-2 md:p-3 rounded-full"
                    >
                      <SkipBack className="w-5 h-5 md:w-6 md:h-6" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current) {
                          videoRef.current.currentTime = Math.min(
                            duration,
                            currentTime + 10
                          );
                        }
                      }}
                      className="text-white hover:bg-white/20 transition-colors p-2 md:p-3 rounded-full"
                    >
                      <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
                    </button>

                    {/* Volume Control */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMuted(!muted);
                          if (videoRef.current) {
                            videoRef.current.muted = !muted;
                          }
                        }}
                        className="text-white hover:bg-white/20 transition-colors p-2 md:p-3 rounded-full"
                      >
                        {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={muted ? 0 : volume * 100}
                        onChange={(e) => {
                          const newVolume = parseFloat(e.target.value) / 100;
                          setVolume(newVolume);
                          setMuted(false);
                          if (videoRef.current) {
                            videoRef.current.volume = newVolume;
                            videoRef.current.muted = false;
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 md:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer hidden sm:block"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 md:space-x-3">
                    {/* Transcript button */}
                    {transcript && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTranscript();
                        }}
                        className={`text-white hover:bg-white/20 transition-colors p-2 md:p-3 rounded-full ${
                          showTranscript ? "bg-[#001e62]" : ""
                        }`}
                        title="Toggle Transcript"
                      >
                        <FileText className="w-5 h-5 md:w-6 md:h-6" />
                      </button>
                    )}

                    {/* Speed Control */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSpeedMenu(!showSpeedMenu);
                        }}
                        className="text-white hover:bg-white/20 transition-colors px-3 md:px-4 py-2 md:py-3 rounded-full text-sm md:text-base font-medium"
                      >
                        {playbackRate}x
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-14 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                          {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                            <button
                              key={speed}
                              onClick={(e) => {
                                e.stopPropagation();
                                changePlaybackRate(speed);
                              }}
                              className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                                playbackRate === speed ? 'bg-[#001e62] text-white' : 'text-gray-700'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (containerRef.current) {
                          if (document.fullscreenElement) {
                            document.exitFullscreen();
                          } else {
                            containerRef.current.requestFullscreen();
                          }
                        }
                      }}
                      className="text-white hover:bg-white/20 transition-colors p-2 md:p-3 rounded-full"
                    >
                      <Maximize className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Panel */}
        {showTranscript && transcript && (
          <div className="w-80 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-lg flex-shrink-0">
            <div className="p-4 bg-[#001e62] text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Transcript
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={downloadTranscript}
                    className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Download Transcript"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowTranscript(false)}
                    className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  placeholder="Search transcript..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>

            <div
              ref={transcriptRef}
              className="h-80 overflow-y-auto p-4 space-y-2"
            >
              {transcriptLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#001e62]" />
                </div>
              ) : filteredTranscript.length > 0 ? (
                filteredTranscript.map((segment, index) => {
                  if (
                    !segment ||
                    typeof segment.start === "undefined" ||
                    !segment.text
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={index}
                      data-segment-id={index}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        activeSegment === index
                          ? "bg-[#001e62] text-white"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        seekToTime(segment.start);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-mono px-2 py-1 rounded ${
                          activeSegment === index 
                            ? "bg-white/20 text-white" 
                            : "bg-[#001e62] text-white"
                        }`}>
                          {formatTime(segment.start)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {searchQuery ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: segment.text.replace(
                                new RegExp(`(${searchQuery})`, "gi"),
                                '<mark class="bg-yellow-200 text-black px-1 rounded">$1</mark>'
                              ),
                            }}
                          />
                        ) : (
                          segment.text
                        )}
                      </p>
                    </div>
                  );
                }).filter(Boolean)
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    {searchQuery ? "No matching segments found" : "No transcript available"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

VideoPlayerWithTranscript.displayName = "VideoPlayerWithTranscript";

export { VideoPlayerWithTranscript };
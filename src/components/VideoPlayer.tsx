import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, ChevronLeft, ChevronRight, StickyNote, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface VideoPlayerProps {
  videoFile: File | null;
  onVideoLoad: (filename: string) => void;
  onTimeRequest?: () => number;
  onFrameRequest?: () => number;
  onSeekRequest?: (time: number) => void;
  isFullscreenNotes: boolean;
  onFullscreenNotesChange?: (isShowing: boolean) => void;
  notesPanel?: React.ReactNode;
}

export const VideoPlayer = ({ videoFile, onVideoLoad, onTimeRequest, onFrameRequest, onSeekRequest, isFullscreenNotes, onFullscreenNotesChange, notesPanel }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isCustomFullscreen, setIsCustomFullscreen] = useState(false);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      onVideoLoad(videoFile.name);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      // Reset when video is unloaded
      setVideoUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [videoFile, onVideoLoad]);

  // Expose methods to parent via callbacks
  useEffect(() => {
    if (onTimeRequest) {
      (window as any).getCurrentVideoTime = () => currentTime;
    }
    if (onFrameRequest) {
      (window as any).getCurrentVideoFrame = () => Math.floor(currentTime * 30);
    }
    if (onSeekRequest) {
      (window as any).seekToVideoTime = (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      };
    }
  }, [currentTime, onTimeRequest, onFrameRequest, onSeekRequest]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    
    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value[0];
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsCustomFullscreen(false);
      onFullscreenNotesChange?.(false);
    } else {
      container.requestFullscreen();
      setIsCustomFullscreen(true);
    }
  };

  const toggleNotesInFullscreen = () => {
    onFullscreenNotesChange?.(!isFullscreenNotes);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsCustomFullscreen(false);
        onFullscreenNotesChange?.(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenNotesChange]);

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const previousFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Assuming 30fps, one frame is approximately 1/30 second
    video.currentTime = Math.max(0, video.currentTime - (1/30));
    toast.success("Previous frame");
  };

  const nextFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Assuming 30fps, one frame is approximately 1/30 second
    video.currentTime = Math.min(video.duration, video.currentTime + (1/30));
    toast.success("Next frame");
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      
      // Disable shortcuts when typing in textarea, input, or contentEditable
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'TEXTAREA' || 
        activeElement?.tagName === 'INPUT' ||
        (activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      
      switch(e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            previousFrame();
          } else {
            skip(-10);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            nextFrame();
          } else {
            skip(10);
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-player-bg rounded-lg min-h-0">
        <p className="text-muted-foreground text-lg">No video loaded. Select a video file to begin.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full bg-player-bg rounded-lg overflow-hidden group min-h-0 ${isCustomFullscreen ? 'flex h-full' : 'h-full'}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className={`relative ${isCustomFullscreen && isFullscreenNotes ? 'w-[70%]' : 'w-full'} h-full min-h-0`}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onClick={togglePlay}
        />
      
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Timeline */}
        <div className="mb-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-foreground/80 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Frame controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={previousFrame}
              className="hover:bg-primary/20"
              title="Previous Frame (Shift + ←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            {/* Skip back */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-10)}
              className="hover:bg-primary/20"
              title="Skip Back 10s (←)"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="hover:bg-primary/20 w-12 h-12"
              title="Play/Pause (Space)"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            
            {/* Skip forward */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(10)}
              className="hover:bg-primary/20"
              title="Skip Forward 10s (→)"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
            
            {/* Next frame */}
            <Button
              variant="ghost"
              size="icon"
              onClick={nextFrame}
              className="hover:bg-primary/20"
              title="Next Frame (Shift + →)"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="hover:bg-primary/20"
                title="Mute (M)"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>
            
            {/* Notes toggle (only in fullscreen) */}
            {isCustomFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleNotesInFullscreen}
                className="hover:bg-primary/20"
                title="Toggle Notes"
              >
                {isFullscreenNotes ? <Minimize className="w-5 h-5" /> : <StickyNote className="w-5 h-5" />}
              </Button>
            )}
            
            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="hover:bg-primary/20"
              title="Fullscreen (F)"
            >
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      </div>
      
      {/* Notes panel container in fullscreen */}
      {isCustomFullscreen && isFullscreenNotes && (
        <div className="w-[30%] h-full border-l border-border overflow-auto bg-background">
          {notesPanel}
        </div>
      )}
    </div>
  );
};

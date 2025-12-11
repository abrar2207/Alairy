import { useState, useEffect, useRef } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { NotesPanel } from "@/components/NotesPanel";
import { Button } from "@/components/ui/button";
import { Upload, Info, Palette, X } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import Logo from "@/assets/logo.png";

const Index = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentVideoFilename, setCurrentVideoFilename] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>("default");
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreenNotes, setIsFullscreenNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("alairy-theme") || "default";
    setTheme(savedTheme);
    if (savedTheme !== "default") {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("alairy-theme", newTheme);
    if (newTheme === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
    toast.success(`Theme: ${newTheme}`, { duration: 300 });
  };

  const getCurrentTime = () => {
    return (window as any).getCurrentVideoTime?.() || 0;
  };

  const getCurrentFrame = () => {
    return (window as any).getCurrentVideoFrame?.() || 0;
  };

  const seekToTime = (time: number) => {
    (window as any).seekToVideoTime?.(time);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("video/")) {
        setVideoFile(file);
        toast.success(`Loaded: ${file.name}`, { duration: 300 });
      } else {
        toast.error("Please select a valid video file", { duration: 300 });
      }
    }
    // Reset input value so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleUnloadVideo = () => {
    setVideoFile(null);
    setCurrentVideoFilename(null);
    toast.success("Video unloaded", { duration: 300 });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      toast.success(`Loaded: ${file.name}`, { duration: 300 });
    } else {
      toast.error("Please drop a valid video file", { duration: 300 });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-subtle p-4 md:p-6 relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="border-4 border-dashed border-primary rounded-2xl p-12 bg-card/50 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4">
              <Upload className="w-16 h-16 text-primary animate-bounce" />
              <p className="text-2xl font-bold text-foreground">Drop your video here</p>
              <p className="text-muted-foreground">Supported formats: MP4, WebM, MOV, AVI</p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Alairy Logo" className="h-16 w-16 object-contain" />
            <div className="flex flex-col">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-none pb-1">
                Alairy
              </h1>
              <p className="text-muted-foreground text-xs mt-1">Notepad for Media</p>
            </div>
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Change theme">
                  <Palette className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleThemeChange("default")}>
                  Default
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("origin-dark")}>
                  Origin Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("origin-light")}>
                  Origin Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("melatonin")}>
                  Melatonin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex gap-2">
              <label htmlFor="video-upload">
                <Button className="bg-gradient-primary hover:opacity-90 shadow-glow cursor-pointer" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Load Video
                  </span>
                </Button>
                <input
                  ref={fileInputRef}
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {videoFile && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleUnloadVideo}
                  title="Unload video"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Keyboard shortcuts info */}
      <div className="mb-4 p-3 bg-card/50 border border-border rounded-lg backdrop-blur-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Keyboard Shortcuts:</span> Space (Play/Pause) • ← → (Skip 10s) • Shift+← → (Frame-by-frame) • F (Fullscreen) • M (Mute)
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="h-[calc(100vh-220px)]">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
          {/* Video Player */}
          <ResizablePanel defaultSize={66} minSize={40}>
            <div className="h-full pr-2">
              <VideoPlayer
                videoFile={videoFile}
                onVideoLoad={setCurrentVideoFilename}
                onTimeRequest={getCurrentTime}
                onFrameRequest={getCurrentFrame}
                onSeekRequest={seekToTime}
                isFullscreenNotes={isFullscreenNotes}
                onFullscreenNotesChange={setIsFullscreenNotes}
                notesPanel={
                  <NotesPanel
                    videoFilename={currentVideoFilename}
                    getCurrentTime={getCurrentTime}
                    getCurrentFrame={getCurrentFrame}
                    seekToTime={seekToTime}
                  />
                }
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/50 transition-colors" />

          {/* Notes Panel - shown in normal mode */}
          <ResizablePanel defaultSize={34} minSize={20}>
            <div className={`h-full pl-2 ${isFullscreenNotes ? 'invisible' : ''}`}>
              <NotesPanel
                videoFilename={currentVideoFilename}
                getCurrentTime={getCurrentTime}
                getCurrentFrame={getCurrentFrame}
                seekToTime={seekToTime}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <footer className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground opacity-70">
        <span>Powered by</span>
        <img
          src="https://i.ibb.co/HpVpWyMF/Whats-App-Image-2025-12-11-at-12-10-20-PM.jpg"
          alt="Origin I Logo"
          className="h-8 w-auto object-contain rounded-sm mix-blend-multiply dark:mix-blend-screen"
        />
        <span>Origin I</span>
      </footer>
    </div>
  );
};

export default Index;

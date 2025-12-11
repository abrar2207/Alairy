import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Save, Trash2, FileText, Clock, Frame, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NotesPanelProps {
  videoFilename: string | null;
  getCurrentTime?: () => number;
  getCurrentFrame?: () => number;
  seekToTime?: (time: number) => void;
}

interface Stamp {
  id: string;
  type: 'time' | 'frame';
  value: number;
  label: string;
}

export interface NotesPanelHandle {
  getEditorRef: () => HTMLDivElement | null;
}

export const NotesPanel = forwardRef<NotesPanelHandle, NotesPanelProps>(({ 
  videoFilename, 
  getCurrentTime, 
  getCurrentFrame, 
  seekToTime 
}, ref) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [lastBackspaceTime, setLastBackspaceTime] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    getEditorRef: () => editorRef.current
  }));

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStampClick = useCallback((stamp: Stamp) => {
    if (!seekToTime) {
      toast.error("Cannot navigate to timestamp", { duration: 300 });
      return;
    }
    
    if (stamp.type === 'time') {
      seekToTime(stamp.value);
      toast.success(`Jumped to ${formatTime(stamp.value)}`, { duration: 300 });
    } else {
      seekToTime(stamp.value / 30);
      toast.success(`Jumped to frame ${stamp.value}`, { duration: 300 });
    }
  }, [seekToTime]);

  // Reattach click listeners to stamp buttons
  const reattachStampListeners = useCallback(() => {
    if (!editorRef.current) return;
    
    const stampButtons = editorRef.current.querySelectorAll('button[data-stamp-id]');
    stampButtons.forEach((button) => {
      const btn = button as HTMLElement;
      const stamp: Stamp = {
        id: btn.dataset.stampId || '',
        type: btn.dataset.stampType as 'time' | 'frame',
        value: parseFloat(btn.dataset.stampValue || '0'),
        label: btn.dataset.stampLabel || ''
      };
      
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true) as HTMLElement;
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleStampClick(stamp);
      });
      btn.parentNode?.replaceChild(newBtn, btn);
    });
  }, [handleStampClick]);

  // Load notes from localStorage
  useEffect(() => {
    if (videoFilename && editorRef.current) {
      const savedNotes = localStorage.getItem(`vidnotes_${videoFilename}`);
      if (savedNotes) {
        editorRef.current.innerHTML = savedNotes;
        // Reattach listeners after loading HTML
        setTimeout(() => reattachStampListeners(), 0);
      } else {
        editorRef.current.innerHTML = '';
      }
      setHasChanges(false);
    }
  }, [videoFilename, reattachStampListeners]);

  // Auto-save with debounce
  const autoSave = useCallback(() => {
    if (!videoFilename || !editorRef.current) return;
    
    localStorage.setItem(`vidnotes_${videoFilename}`, editorRef.current.innerHTML);
    setHasChanges(false);
  }, [videoFilename]);

  const handleInput = () => {
    setHasChanges(true);
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Auto-save after 1 second of no typing
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 1000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const saveNotes = () => {
    if (!videoFilename || !editorRef.current) {
      toast.error("No video loaded", { duration: 300 });
      return;
    }
    
    localStorage.setItem(`vidnotes_${videoFilename}`, editorRef.current.innerHTML);
    setHasChanges(false);
    toast.success("Notes saved", { duration: 300 });
  };

  const clearNotes = () => {
    if (!videoFilename || !editorRef.current) return;
    
    if (window.confirm("Are you sure you want to delete all notes for this video?")) {
      localStorage.removeItem(`vidnotes_${videoFilename}`);
      editorRef.current.innerHTML = '';
      setHasChanges(false);
      toast.success("Notes deleted", { duration: 300 });
    }
  };

  const exportNotes = () => {
    if (!videoFilename || !editorRef.current) {
      toast.error("No notes to export", { duration: 300 });
      return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorRef.current.innerHTML;
    
    // Convert stamp buttons to readable text
    const stampButtons = tempDiv.querySelectorAll('button[data-stamp-id]');
    stampButtons.forEach((btn) => {
      const stampType = (btn as HTMLElement).dataset.stampType;
      const stampValue = (btn as HTMLElement).dataset.stampValue;
      let text = '';
      
      if (stampType === 'time' && stampValue) {
        const seconds = parseFloat(stampValue);
        text = `[${formatTime(seconds)}]`;
      } else if (stampType === 'frame' && stampValue) {
        text = `[Frame ${stampValue}]`;
      }
      
      btn.replaceWith(document.createTextNode(text));
    });

    // Get plain text content
    const content = tempDiv.innerText || tempDiv.textContent || '';
    
    // Create markdown content
    const markdown = `# Notes for ${videoFilename}\n\n${content}`;
    
    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFilename.replace(/\.[^/.]+$/, '')}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Notes exported", { duration: 300 });
  };

  const insertTimestamp = () => {
    if (!getCurrentTime || !videoFilename || !editorRef.current) {
      toast.error("Video player not ready", { duration: 300 });
      return;
    }
    
    const time = getCurrentTime();
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const timeStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const stamp: Stamp = {
      id: `time-${Date.now()}`,
      type: 'time',
      value: time,
      label: 'Timestamp'
    };
    
    insertStampButton(stamp, timeStr);
    toast.success("Timestamp inserted", { duration: 300 });
  };

  const insertFrameStamp = () => {
    if (!getCurrentFrame || !videoFilename || !editorRef.current) {
      toast.error("Video player not ready", { duration: 300 });
      return;
    }
    
    const frame = getCurrentFrame();
    const stamp: Stamp = {
      id: `frame-${Date.now()}`,
      type: 'frame',
      value: frame,
      label: 'Frame'
    };
    
    insertStampButton(stamp, `F${frame}`);
    toast.success("Frame stamp inserted", { duration: 300 });
  };

  const insertStampButton = (stamp: Stamp, displayText: string) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    
    const stampButton = document.createElement('button');
    stampButton.contentEditable = 'false';
    stampButton.className = 'inline-flex items-center gap-1 mx-0.5 text-xs font-semibold stamp-text hover:opacity-70 transition-opacity cursor-pointer';
    stampButton.dataset.stampId = stamp.id;
    stampButton.dataset.stampType = stamp.type;
    stampButton.dataset.stampValue = stamp.value.toString();
    stampButton.dataset.stampLabel = stamp.label;
    
    const icon = document.createElement('span');
    icon.innerHTML = stamp.type === 'time' 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></svg>';
    
    const text = document.createElement('span');
    text.textContent = displayText;
    text.contentEditable = 'false';
    
    stampButton.appendChild(icon);
    stampButton.appendChild(text);
    
    stampButton.addEventListener('click', (e) => {
      e.preventDefault();
      handleStampClick(stamp);
    });
    
    if (range && editorRef.current.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(stampButton);
      range.setStartAfter(stampButton);
      range.setEndAfter(stampButton);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      editorRef.current.appendChild(stampButton);
    }
    
    setHasChanges(true);
    editorRef.current.focus();
    
    // Auto-save after inserting stamp
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && editorRef.current) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      if (!range.collapsed) return;
      
      const node = range.startContainer;
      const offset = range.startOffset;
      
      if (node.nodeType === Node.TEXT_NODE && offset === node.textContent?.length) {
        const nextSibling = node.nextSibling;
        if (nextSibling && (nextSibling as HTMLElement).dataset?.stampId) {
          const now = Date.now();
          if (now - lastBackspaceTime < 500) {
            e.preventDefault();
            nextSibling.remove();
            setHasChanges(true);
            toast.success("Stamp deleted", { duration: 300 });
            setLastBackspaceTime(0);
            return;
          }
          setLastBackspaceTime(now);
          e.preventDefault();
          return;
        }
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const prevNode = offset > 0 ? element.childNodes[offset - 1] : null;
        if (prevNode && (prevNode as HTMLElement).dataset?.stampId) {
          const now = Date.now();
          if (now - lastBackspaceTime < 500) {
            e.preventDefault();
            prevNode.remove();
            setHasChanges(true);
            toast.success("Stamp deleted", { duration: 300 });
            setLastBackspaceTime(0);
            return;
          }
          setLastBackspaceTime(now);
          e.preventDefault();
          return;
        }
      }
      
      setLastBackspaceTime(0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Notes</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={insertTimestamp}
            disabled={!videoFilename}
            className="hover:bg-accent/20"
            title="Insert timestamp"
          >
            <Clock className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={insertFrameStamp}
            disabled={!videoFilename}
            className="hover:bg-accent/20"
            title="Insert frame stamp"
          >
            <Frame className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearNotes}
            disabled={!videoFilename}
            className="hover:bg-destructive/20 hover:text-destructive"
            title="Delete notes"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={saveNotes}
            disabled={!videoFilename || !hasChanges}
            className="bg-gradient-primary hover:opacity-90"
            title="Save notes"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={exportNotes}
            disabled={!videoFilename}
            className="bg-gradient-primary hover:opacity-90"
            title="Export notes"
          >
            <Download className="w-4 h-4" />
          </Button>
          {hasChanges && (
            <span title="Auto-saving...">
              <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden min-h-0">
        {videoFilename ? (
          <div className="h-full flex flex-col p-4">
            <p className="text-sm text-muted-foreground mb-2 flex-shrink-0">
              Notes for: <span className="text-foreground font-medium">{videoFilename}</span>
            </p>
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              className="flex-1 overflow-auto p-3 rounded-md border border-input bg-secondary/50 focus:border-primary focus:outline-none transition-colors text-sm min-h-0"
              data-placeholder="Write your notes here... Use Time/Frame buttons to insert stamps. Double backspace to delete stamps."
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              Load a video to start taking notes
            </p>
          </div>
        )}
      </div>
      
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        [contenteditable] button {
          user-select: none;
        }
        /* Stamp text colors per theme */
        .stamp-text {
          color: hsl(217 91% 60%);
          background: transparent;
        }
        [data-theme="origin-dark"] .stamp-text,
        [data-theme="origin-light"] .stamp-text {
          color: hsl(25 95% 53%);
        }
        [data-theme="melatonin"] .stamp-text {
          color: hsl(270 60% 60%);
        }
      `}</style>
    </div>
  );
});

NotesPanel.displayName = 'NotesPanel';

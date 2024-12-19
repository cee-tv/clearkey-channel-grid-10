import { Maximize2, Minimize2, Play, Pause, Volume2, VolumeX, X, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { cn } from '@/lib/utils';
import { VideoControlsProps } from './VideoPlayerTypes';

const VideoControls = ({
  isPlaying,
  isFullscreen,
  volume,
  isMuted,
  showControls,
  channelTitle,
  onPlayPause,
  onFullscreenToggle,
  onVolumeChange,
  onMuteToggle,
  onClose,
  onPrevChannel,
  onNextChannel
}: VideoControlsProps) => {
  return (
    <>
      {/* Top bar with close button and channel title */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent",
          "flex items-center justify-between",
          "transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full w-12 h-12"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
        
        <h2 className="text-white text-xl font-semibold drop-shadow-lg">
          {channelTitle}
        </h2>
        
        <div className="w-12" /> {/* Spacer to center the title */}
      </div>

      {/* Center controls for play/pause and channel navigation */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "flex items-center gap-4",
          "transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full w-16 h-16"
          onClick={onPrevChannel}
          disabled={!onPrevChannel}
        >
          <SkipBack className="h-8 w-8" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full w-20 h-20"
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <Pause className="h-10 w-10" />
          ) : (
            <Play className="h-10 w-10 ml-1" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full w-16 h-16"
          onClick={onNextChannel}
          disabled={!onNextChannel}
        >
          <SkipForward className="h-8 w-8" />
        </Button>
      </div>

      {/* Bottom controls */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent",
          "transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full"
              onClick={onMuteToggle}
            >
              {isMuted ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </Button>
            <Slider
              className="w-24"
              value={[isMuted ? 0 : volume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={onVolumeChange}
            />
          </div>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full"
            onClick={onFullscreenToggle}
          >
            {isFullscreen ? (
              <Minimize2 className="h-6 w-6" />
            ) : (
              <Maximize2 className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default VideoControls;
import { useEffect, useRef } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui';

interface VideoPlayerProps {
  manifestUrl: string;
  drmKey?: {
    keyId: string;
    key: string;
  };
}

const VideoPlayer = ({ manifestUrl, drmKey }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<shaka.Player | null>(null);

  useEffect(() => {
    const initPlayer = async () => {
      if (!videoRef.current) return;

      // Install built-in polyfills to patch browser incompatibilities
      shaka.polyfill.installAll();

      // Check if the browser supports the basic functionality
      if (!shaka.Player.isBrowserSupported()) {
        console.error('Browser not supported!');
        return;
      }

      try {
        if (playerRef.current) {
          await playerRef.current.destroy();
        }

        // Create a Player instance
        const player = new shaka.Player(videoRef.current);
        playerRef.current = player;

        // Attach player event listeners
        player.addEventListener('error', (event) => {
          console.error('Error code', event.detail.code, 'object', event.detail);
        });

        // Configure DRM if key is provided
        if (drmKey) {
          player.configure({
            drm: {
              clearKeys: {
                [drmKey.keyId]: drmKey.key
              }
            }
          });
        }

        // Load the manifest
        await player.load(manifestUrl);
        console.log('The video has now been loaded!');
      } catch (error) {
        console.error('Error loading video:', error);
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [manifestUrl, drmKey]);

  return (
    <div className="relative w-full aspect-video bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
      />
    </div>
  );
};

export default VideoPlayer;
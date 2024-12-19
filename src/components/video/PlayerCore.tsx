import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import shaka from 'shaka-player';

interface PlayerCoreProps {
  manifestUrl: string;
  drmKey?: {
    keyId: string;
    key: string;
  };
  videoRef: React.RefObject<HTMLVideoElement>;
}

const PlayerCore = ({ manifestUrl, drmKey, videoRef }: PlayerCoreProps) => {
  const playerRef = useRef<shaka.Player | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const initPlayer = async () => {
      if (!videoRef.current) return;

      // Cleanup previous instances
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (playerRef.current) {
        await playerRef.current.destroy();
        playerRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        if (manifestUrl.includes('.m3u8')) {
          // HLS Setup
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 30,
              maxBufferSize: 30 * 1000 * 1000,
              maxBufferLength: 30,
              startLevel: -1,
              manifestLoadingTimeOut: 10000,
              manifestLoadingMaxRetry: 3,
              levelLoadingTimeOut: 10000,
              levelLoadingMaxRetry: 3,
              fragLoadingTimeOut: 10000,
              fragLoadingMaxRetry: 3
            });

            hlsRef.current = hls;
            hls.loadSource(manifestUrl);
            hls.attachMedia(videoRef.current);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              videoRef.current?.play().catch(error => {
                console.error('HLS autoplay failed:', error);
              });
            });
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = manifestUrl;
            videoRef.current.play().catch(error => {
              console.error('Native HLS autoplay failed:', error);
            });
          }
        } else {
          // DASH Setup
          shaka.polyfill.installAll();
          
          if (!shaka.Player.isBrowserSupported()) {
            throw new Error('Browser not supported for DASH playback');
          }

          const player = new shaka.Player();
          await player.attach(videoRef.current);
          playerRef.current = player;

          player.configure({
            streaming: {
              bufferingGoal: 30,
              rebufferingGoal: 2,
              bufferBehind: 30,
              retryParameters: {
                maxAttempts: 3,
                baseDelay: 1000,
                backoffFactor: 2,
                timeout: 10000
              }
            }
          });

          if (drmKey) {
            player.configure({
              drm: {
                clearKeys: {
                  [drmKey.keyId]: drmKey.key
                }
              }
            });
          }

          await player.load(manifestUrl, undefined, undefined, abortControllerRef.current.signal);
          videoRef.current.play().catch(error => {
            console.error('DASH autoplay failed:', error);
          });
        }
      } catch (error) {
        console.error('Error initializing player:', error);
      }
    };

    initPlayer();

    return () => {
      // Cleanup on unmount or when manifestUrl changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [manifestUrl, drmKey, videoRef]);

  return null;
};

export default PlayerCore;
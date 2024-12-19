import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
// @ts-ignore
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
  const playerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const initPlayer = async () => {
      if (!videoRef.current) return;

      try {
        // Clean up previous instances before initializing new ones
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

        if (manifestUrl.includes('.m3u8')) {
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
              maxBufferSize: 0,
              maxBufferLength: 30,
              startLevel: -1,
              manifestLoadingTimeOut: 20000,
              manifestLoadingMaxRetry: 5,
              levelLoadingTimeOut: 20000,
              levelLoadingMaxRetry: 5,
              fragLoadingTimeOut: 20000,
              fragLoadingMaxRetry: 5
            });

            hlsRef.current = hls;
            hls.loadSource(manifestUrl);
            hls.attachMedia(videoRef.current);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              videoRef.current?.play().catch(error => {
                console.error('HLS autoplay failed:', error);
              });
            });

            // Add error handling for HLS
            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                console.error('Fatal HLS error:', data);
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    hls.destroy();
                    break;
                }
              }
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

          // Configure player with more resilient settings
          player.configure({
            streaming: {
              bufferingGoal: 60,
              rebufferingGoal: 2,
              bufferBehind: 90,
              retryParameters: {
                maxAttempts: 5,
                baseDelay: 1000,
                backoffFactor: 2,
                timeout: 20000
              },
              failureCallback: (error) => {
                console.error('Shaka player error:', error);
                // Attempt to recover from error
                if (player) {
                  player.retryStreaming();
                }
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

          try {
            await player.load(manifestUrl, undefined, undefined, abortControllerRef.current.signal);
            await videoRef.current.play();
          } catch (error) {
            console.error('Error loading or playing DASH content:', error);
            // Attempt to recover from error
            if (player && !abortControllerRef.current.signal.aborted) {
              player.retryStreaming();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing player:', error);
      }
    };

    initPlayer();

    return () => {
      // Cleanup function
      const cleanup = async () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        if (playerRef.current) {
          try {
            await playerRef.current.destroy();
            playerRef.current = null;
          } catch (error) {
            console.error('Error destroying Shaka player:', error);
          }
        }
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
      cleanup();
    };
  }, [manifestUrl, drmKey, videoRef]);

  return null;
};

export default PlayerCore;
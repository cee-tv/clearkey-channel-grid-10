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

  useEffect(() => {
    let mounted = true;

    const initPlayer = async () => {
      if (!videoRef.current || !mounted) return;

      try {
        // Clean up previous instances before initializing new ones
        if (playerRef.current) {
          try {
            await playerRef.current.destroy();
          } catch (error) {
            console.error('Error destroying previous player:', error);
          }
          playerRef.current = null;
        }

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        // Small delay to ensure proper cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mounted) return;

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
              if (mounted && videoRef.current) {
                videoRef.current.play().catch(error => {
                  console.error('HLS autoplay failed:', error);
                });
              }
            });

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
          
          // Configure player with more resilient settings
          player.configure({
            streaming: {
              bufferingGoal: 30,
              rebufferingGoal: 2,
              bufferBehind: 30,
              retryParameters: {
                maxAttempts: 5,
                baseDelay: 1000,
                backoffFactor: 2,
                timeout: 20000
              },
              failureCallback: (error) => {
                console.error('Shaka player error:', error);
                if (player && mounted) {
                  player.retryStreaming();
                }
              }
            }
          });

          if (!mounted) return;

          try {
            await player.attach(videoRef.current);
            playerRef.current = player;

            if (drmKey) {
              player.configure({
                drm: {
                  clearKeys: {
                    [drmKey.keyId]: drmKey.key
                  }
                }
              });
            }

            await player.load(manifestUrl);
            
            if (mounted && videoRef.current) {
              await videoRef.current.play();
            }
          } catch (error) {
            console.error('Error loading or playing DASH content:', error);
            if (mounted && player) {
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
      mounted = false;
      const cleanup = async () => {
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
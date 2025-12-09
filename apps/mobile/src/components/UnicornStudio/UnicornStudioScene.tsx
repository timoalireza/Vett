/**
 * Unicorn Studio Scene Component for React Native
 * 
 * This component uses WebView to embed Unicorn Studio scenes since
 * unicornstudio-react is designed for web React, not React Native.
 * 
 * Based on: https://github.com/diegopeixoto/unicornstudio-react
 */

import React, { useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

interface UnicornStudioSceneProps {
  /**
   * Your Unicorn Studio project embed ID
   * Get this from Unicorn Studio → Export → Embed
   */
  projectId: string;
  
  /**
   * Width of the scene container
   */
  width?: number | string;
  
  /**
   * Height of the scene container
   */
  height?: number | string;
  
  /**
   * Rendering scale (0.25-1, lower values improve performance)
   */
  scale?: number;
  
  /**
   * Frames per second (0-120)
   */
  fps?: number;
  
  /**
   * Show loading indicator
   */
  showLoading?: boolean;
  
  /**
   * Make WebView non-interactive (for background scenes)
   */
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
  
  /**
   * Callback when scene loads successfully
   */
  onLoad?: () => void;
  
  /**
   * Callback when scene fails to load
   */
  onError?: (error: Error) => void;
}

export const UnicornStudioScene: React.FC<UnicornStudioSceneProps> = ({
  projectId,
  width = '100%',
  height = '100%',
  scale = 1,
  fps = 60,
  showLoading = true,
  pointerEvents = 'auto',
  onLoad,
  onError,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  // Generate HTML that embeds Unicorn Studio scene using Framer module
  // Based on: https://framer.com/m/UnicornStudioEmbed-wWy9.js
  const framerModuleUrl = 'https://framerusercontent.com/modules/vbaJXlyVEeIvuEevvudG/sdnahuf8yuWGajQydqqU/UnicornStudioEmbed.js';
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Unicorn Studio Scene</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
    }
    #unicorn-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      position: relative;
    }
    #unicorn-scene {
      width: 100%;
      height: 100%;
      background: transparent;
    }
  </style>
</head>
<body>
  <div id="unicorn-container">
    <div id="unicorn-scene"></div>
  </div>
  
  <script>
    (function() {
      console.log('[UnicornStudio] Starting initialization with Framer module...');
      
      // Load the Framer module as a regular script (more compatible with WebView)
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = \`
        import UnicornStudioEmbed from '${framerModuleUrl}';
        window.UnicornStudioEmbedModule = UnicornStudioEmbed;
        window.UnicornStudioEmbedReady = true;
      \`;
      
      script.onerror = function() {
        console.error('[UnicornStudio] Failed to load module, trying direct script...');
        // Fallback: try loading as regular script
        loadAsRegularScript();
      };
      
      document.head.appendChild(script);
      
      function loadAsRegularScript() {
        const fallbackScript = document.createElement('script');
        fallbackScript.src = '${framerModuleUrl}';
        fallbackScript.onload = function() {
          console.log('[UnicornStudio] Script loaded as regular script');
          checkForModule();
        };
        fallbackScript.onerror = function() {
          console.error('[UnicornStudio] Both module and script loading failed');
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Failed to load Unicorn Studio module'
            }));
          }
        };
        document.head.appendChild(fallbackScript);
      }
      
      function checkForModule() {
        let retryCount = 0;
        const maxRetries = 20;
        
        function check() {
          const UnicornStudioEmbed = window.UnicornStudioEmbedModule || 
                                     window.UnicornStudioEmbed || 
                                     window.default;
          
          if (window.UnicornStudioEmbedReady || UnicornStudioEmbed) {
            console.log('[UnicornStudio] Module ready:', UnicornStudioEmbed);
            initScene(UnicornStudioEmbed);
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(check, 300);
          } else {
            console.error('[UnicornStudio] Module not found after', maxRetries, 'attempts');
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'Unicorn Studio module not found'
              }));
            }
          }
        }
        
        setTimeout(check, 500);
      }
      
      function initScene(UnicornStudioEmbed) {
        try {
          const container = document.getElementById('unicorn-scene');
          if (!container) {
            throw new Error('Container element not found');
          }
          
          console.log('[UnicornStudio] Creating scene with projectId:', '${projectId}');
          
          // Try different initialization methods
          let scene;
          
          if (typeof UnicornStudioEmbed === 'function') {
            scene = new UnicornStudioEmbed({
              projectId: '${projectId}',
              container: container,
              scale: ${scale},
              fps: ${fps}
            });
          } else if (UnicornStudioEmbed && typeof UnicornStudioEmbed.create === 'function') {
            scene = UnicornStudioEmbed.create({
              projectId: '${projectId}',
              container: container,
              scale: ${scale},
              fps: ${fps},
              onLoad: function() {
                console.log('[UnicornStudio] Scene loaded successfully');
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'load',
                    message: 'Scene loaded successfully'
                  }));
                }
              },
              onError: function(error) {
                console.error('[UnicornStudio] Scene error:', error);
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: error && error.message ? error.message : 'Failed to load scene'
                  }));
                }
              }
            });
          } else {
            console.warn('[UnicornStudio] Module format not recognized:', UnicornStudioEmbed);
          }
          
          console.log('[UnicornStudio] Scene created:', scene);
          
          // Send success message after a delay
          setTimeout(function() {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'load',
                message: 'Scene initialized'
              }));
            }
          }, 2000);
        } catch (error) {
          console.error('[UnicornStudio] Initialization error:', error);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: error.message || 'Failed to initialize scene'
            }));
          }
        }
      }
      
      // Also check periodically in case module loads asynchronously
      setTimeout(checkForModule, 1000);
    })();
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[UnicornStudio] Message received:', data);
      
      if (data.type === 'load') {
        console.log('[UnicornStudio] Scene loaded successfully');
        setIsLoading(false);
        setHasError(false);
        onLoad?.();
      } else if (data.type === 'error') {
        console.error('[UnicornStudio] Error:', data.message);
        setIsLoading(false);
        setHasError(true);
        onError?.(new Error(data.message));
      }
    } catch (error) {
      console.error('[UnicornStudio] Failed to parse WebView message:', error);
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[UnicornStudio] WebView error:', nativeEvent);
    setIsLoading(false);
    setHasError(true);
    onError?.(new Error(nativeEvent.description || 'WebView error'));
  };

  return (
    <View style={[styles.container, { width, height }]} pointerEvents={pointerEvents}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[styles.webview, { backgroundColor: 'transparent' }]}
        onMessage={handleMessage}
        onError={handleError}
        onLoadStart={() => {
          console.log('[UnicornStudio] WebView started loading:', embedUrl);
        }}
        onLoadEnd={() => {
          console.log('[UnicornStudio] WebView finished loading');
          // Give it a moment to initialize
          setTimeout(() => {
            if (isLoading && !hasError) {
              console.log('[UnicornStudio] Setting loading to false after timeout');
              setIsLoading(false);
              onLoad?.();
            }
          }, 2000);
        }}
        onLoadProgress={({ nativeEvent }) => {
          console.log('[UnicornStudio] Load progress:', nativeEvent.progress);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsFullscreenVideo={true}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[UnicornStudio] HTTP error:', nativeEvent.statusCode, nativeEvent.url);
          // If direct URL fails (404), the embed URL format might be wrong
          // Log this for debugging
          if (nativeEvent.statusCode === 404) {
            console.error('[UnicornStudio] Embed URL returned 404. URL format might be incorrect:', embedUrl);
            setHasError(true);
            onError?.(new Error(`Embed URL not found (404). Please verify the project ID: ${projectId}`));
          }
        }}
      />
      
      {showLoading && isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
      
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load scene{'\n'}
            Project ID: {projectId}
          </Text>
          <Text style={[styles.errorText, { marginTop: 8, fontSize: 12, opacity: 0.7 }]}>
            Check console logs for details
          </Text>
        </View>
      )}
      
      {/* Debug: Show WebView is rendering */}
      {!hasError && isLoading && (
        <View style={styles.debugContainer} pointerEvents="none">
          <Text style={styles.debugText}>Loading Unicorn Studio...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  debugContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});


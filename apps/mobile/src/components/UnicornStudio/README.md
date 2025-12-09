# Unicorn Studio Integration

This directory contains components for embedding Unicorn Studio interactive scenes in your React Native app.

## Components

### `UnicornStudioScene.tsx`

A React Native component that uses WebView to embed Unicorn Studio scenes. Since `unicornstudio-react` is designed for web React (Vite/Next.js), we use WebView to render the scene.

## Usage

```tsx
import { UnicornStudioScene } from '../../src/components/UnicornStudio/UnicornStudioScene';

export default function MyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <UnicornStudioScene
        projectId="YOUR_PROJECT_ID"
        width="100%"
        height={600}
        scale={1}
        fps={60}
        onLoad={() => console.log('Scene loaded!')}
        onError={(error) => console.error('Error:', error)}
      />
    </View>
  );
}
```

## Getting Your Project ID

1. Go to [Unicorn Studio](https://unicorn.studio)
2. Open your project
3. Click on "Export" or "Embed"
4. Copy the project ID from the embed code

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `projectId` | `string` | **required** | Your Unicorn Studio project embed ID |
| `width` | `number \| string` | `'100%'` | Width of the scene container |
| `height` | `number \| string` | `'100%'` | Height of the scene container |
| `scale` | `number` | `1` | Rendering scale (0.25-1, lower values improve performance) |
| `fps` | `number` | `60` | Frames per second (0-120) |
| `showLoading` | `boolean` | `true` | Show loading indicator |
| `onLoad` | `() => void` | - | Callback when scene loads successfully |
| `onError` | `(error: Error) => void` | - | Callback when scene fails to load |

## Performance Tips

- Use `scale={0.5}` or lower for better performance on mobile devices
- Reduce `fps` to 30 for less demanding animations
- Ensure your Unicorn Studio scene is optimized for mobile

## Integration with Analyze Screen

To use this as your homescreen, update `apps/mobile/app/(tabs)/analyze.tsx`:

```tsx
import { UnicornStudioScene } from '../../src/components/UnicornStudio/UnicornStudioScene';

export default function AnalyzeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <UnicornStudioScene
        projectId="YOUR_PROJECT_ID"
        width="100%"
        height="100%"
      />
    </SafeAreaView>
  );
}
```

## Notes

- The component uses WebView to render the web-based Unicorn Studio scene
- Requires internet connection to load the Unicorn Studio script
- The scene is rendered using WebGL, which requires device support
- Performance may vary based on device capabilities

## References

- [Unicorn Studio](https://unicorn.studio)
- [unicornstudio-react](https://github.com/diegopeixoto/unicornstudio-react)
- [react-native-webview](https://github.com/react-native-webview/react-native-webview)

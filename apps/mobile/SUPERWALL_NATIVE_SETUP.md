# Superwall Native SDK Setup for React Native/Expo

Since Superwall doesn't have a direct React Native npm package, you'll need to integrate the native iOS and Android SDKs and create a bridge.

## Option 1: Use RevenueCat Instead (Recommended)

RevenueCat has excellent React Native/Expo support and similar functionality:

```bash
pnpm add react-native-purchases
```

See: https://www.revenuecat.com/docs/react-native

## Option 2: Create Native Bridge for Superwall

### iOS Setup

1. **Add SuperwallKit to Podfile** (`ios/Podfile`):
```ruby
pod 'SuperwallKit', '~> 3.0'
```

2. **Install pods**:
```bash
cd ios && pod install && cd ..
```

3. **Create React Native Bridge Module** (`ios/SuperwallBridge.m`):
```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(SuperwallBridge, NSObject)

RCT_EXTERN_METHOD(configure:(NSString *)apiKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(identify:(NSString *)userId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reset:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(present:(NSString *)placementId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

4. **Create Swift Bridge** (`ios/SuperwallBridge.swift`):
```swift
import Foundation
import SuperwallKit
import React

@objc(SuperwallBridge)
class SuperwallBridge: RCTEventEmitter {
  
  @objc
  func configure(_ apiKey: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    Superwall.configure(apiKey: apiKey)
    resolver(nil)
  }
  
  @objc
  func identify(_ userId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    Superwall.shared.identify(userId: userId)
    resolver(nil)
  }
  
  @objc
  func reset(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    Superwall.shared.reset()
    resolver(nil)
  }
  
  @objc
  func present(_ placementId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    Task {
      do {
        try await Superwall.shared.register(placement: placementId)
        await MainActor.run {
          resolver(nil)
        }
      } catch {
        await MainActor.run {
          rejecter("SUPERWALL_ERROR", error.localizedDescription, error)
        }
      }
    }
  }
  
  override func supportedEvents() -> [String]! {
    return []
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
```

### Android Setup

1. **Add to `android/app/build.gradle`**:
```gradle
dependencies {
    implementation 'com.superwall:superwall-android:3.0.0'
}
```

2. **Create React Native Module** (`android/app/src/main/java/com/timoalireza/vett/SuperwallModule.java`):
```java
package com.timoalireza.vett;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class SuperwallModule extends ReactContextBaseJavaModule {
    public SuperwallModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "SuperwallBridge";
    }

    @ReactMethod
    public void configure(String apiKey, Promise promise) {
        // Implement Superwall Android SDK initialization
        promise.resolve(null);
    }

    @ReactMethod
    public void identify(String userId, Promise promise) {
        // Implement user identification
        promise.resolve(null);
    }

    @ReactMethod
    public void reset(Promise promise) {
        // Implement reset
        promise.resolve(null);
    }

    @ReactMethod
    public void present(String placementId, Promise promise) {
        // Implement paywall presentation
        promise.resolve(null);
    }
}
```

3. **Create Package** (`android/app/src/main/java/com/timoalireza/vett/SuperwallPackage.java`):
```java
package com.timoalireza.vett;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SuperwallPackage implements ReactPackage {
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new SuperwallModule(reactContext));
        return modules;
    }
}
```

4. **Register in MainApplication** (`android/app/src/main/java/.../MainApplication.java`):
```java
import com.timoalireza.vett.SuperwallPackage;

// In getPackages():
packages.add(new SuperwallPackage());
```

### Update TypeScript Service

Update `src/services/superwall.ts` to use the native bridge:

```typescript
import { NativeModules } from 'react-native';

const { SuperwallBridge } = NativeModules;

export async function initializeSuperwall(userId?: string): Promise<void> {
  const apiKey = getSuperwallApiKey();
  await SuperwallBridge.configure(apiKey);
  if (userId) {
    await SuperwallBridge.identify(userId);
  }
}

export async function identifyUser(userId: string, email?: string): Promise<void> {
  await SuperwallBridge.identify(userId);
}

export async function resetUser(): Promise<void> {
  await SuperwallBridge.reset();
}

export async function presentPaywall(placementId: string): Promise<void> {
  await SuperwallBridge.present(placementId);
}
```

## Option 3: Use Superwall REST API

Alternatively, you can use Superwall's REST API directly from JavaScript without native modules:

```typescript
// Use fetch to call Superwall API
const response = await fetch('https://api.superwall.com/v1/paywalls', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});
```

However, this won't give you the native paywall UI - you'd need to build your own UI.

## Recommendation

**For Expo/React Native, I recommend using RevenueCat instead** as it has:
- ✅ Official React Native SDK
- ✅ Expo support
- ✅ Easy setup
- ✅ Similar paywall management features
- ✅ Better documentation for React Native

Would you like me to set up RevenueCat instead?


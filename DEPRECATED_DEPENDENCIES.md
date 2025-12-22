# Deprecated Subdependencies Report

This document lists all deprecated subdependencies found in the project's dependency tree.

## Summary

The following deprecated packages were identified in `pnpm-lock.yaml`:

## 1. **inflight@1.0.6** ⚠️ CRITICAL
- **Status**: Deprecated - Memory leaks
- **Message**: "This module is not supported, and leaks memory. Do not use it."
- **Used by**: 
  - `glob@7.1.6`
  - `glob@7.2.3`
  - `glob@8.1.0`
- **Recommendation**: Update to `glob@9.x` or later, which doesn't use `inflight`

## 2. **glob@7.1.6, glob@7.2.3, glob@8.1.0** ⚠️
- **Status**: Deprecated
- **Message**: "Glob versions prior to v9 are no longer supported"
- **Recommendation**: Update parent packages that depend on these to versions that use `glob@9.x`

## 3. **querystring@0.2.1** ⚠️
- **Status**: Deprecated - Legacy API
- **Message**: "The querystring API is considered Legacy. new code should use the URLSearchParams API instead."
- **Used by**: `@react-native-community/cli`
- **Recommendation**: Update `@react-native-community/cli` to a newer version that doesn't use this package

## 4. **osenv@0.1.5** ⚠️
- **Status**: Deprecated
- **Message**: "This package is no longer supported."
- **Used by**: `npm-run-path`
- **Recommendation**: Update packages that depend on `npm-run-path` to newer versions

## 5. **@xmldom/xmldom@0.7.13** ⚠️
- **Status**: Deprecated
- **Message**: "this version is no longer supported, please update to at least 0.8.*"
- **Used by**: `@expo/prebuild-config`
- **Note**: Version `0.8.11` is also present in the lock file (not deprecated)
- **Recommendation**: Update `@expo/prebuild-config` or force resolution to use `0.8.11`

## 6. **source-map@0.8.0-beta.0** ⚠️
- **Status**: Deprecated - Beta version
- **Message**: "The work that was done in this beta branch won't be included in future versions"
- **Used by**: `metro-source-map@0.80.12`
- **Recommendation**: Update Metro-related packages to newer versions

## 7. **sudo-prompt@9.2.1** ⚠️
- **Status**: Deprecated
- **Message**: "Package no longer supported. Contact Support at https://www.npmjs.com/support for more info."
- **Used by**: `@expo/sudo-prompt@9.3.2`
- **Recommendation**: Update Expo packages to newer versions that don't use this

## Action Items

### High Priority (Security/Memory Issues)
1. **inflight** - Memory leaks, used by old glob versions
   - Update packages using `glob@7.x` or `glob@8.x` to versions using `glob@9.x`
   - Consider using `pnpm.overrides` to force `glob@9.x` if parent packages haven't updated

2. **@xmldom/xmldom@0.7.13** - Security vulnerabilities in older versions
   - Force resolution to `0.8.11` using `pnpm.overrides`

### Medium Priority (Legacy APIs)
3. **querystring** - Legacy Node.js API
   - Update `@react-native-community/cli` to latest version
   - Check if Expo SDK update resolves this

4. **osenv** - No longer maintained
   - Update packages that depend on `npm-run-path`

### Low Priority (Beta/Unsupported)
5. **source-map@0.8.0-beta.0** - Beta version
   - Update Metro/React Native tooling when possible

6. **sudo-prompt** - No longer supported
   - Update Expo packages to latest versions

## Implementation Status

### ✅ Implemented
- **@xmldom/xmldom**: Added override to force `^0.8.11` in root `package.json`
  - This fixes the deprecated `0.7.13` version used by `@expo/prebuild-config`

### ⚠️ Pending (Requires Testing)
- **glob/inflight**: Not yet overridden due to potential compatibility issues
  - `glob@9.x` would fix the `inflight` memory leak issue
  - However, some packages may not be compatible with `glob@9`
  - **Recommendation**: Test with `glob@9` override in a separate branch first

## Recommended Fixes

### Option 1: Add pnpm.overrides (Quick Fix) - PARTIALLY IMPLEMENTED
Currently in root `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "@xmldom/xmldom": "^0.8.11"
    }
  }
}
```

**To fix glob/inflight (TEST FIRST):**
```json
{
  "pnpm": {
    "overrides": {
      "@xmldom/xmldom": "^0.8.11",
      "glob": "^9.0.0"
    }
  }
}
```

**Note**: Be careful with overrides as they may break packages that aren't compatible with newer versions. Test thoroughly after adding `glob@9`.

### Option 2: Update Parent Packages (Recommended)
1. Update Expo SDK to latest version (currently on `51.0.28`, latest is `54.0.25`)
2. Update React Native to latest version
3. Update `@react-native-community/cli` to latest
4. Run `pnpm update` to get latest compatible versions

### Option 3: Gradual Migration
1. Start with non-critical packages
2. Test thoroughly after each update
3. Use `pnpm why <package>` to identify dependency chains
4. Update one package at a time

## Checking Dependency Trees

To see which packages depend on a deprecated package:

```bash
pnpm why <package-name>
```

Example:
```bash
pnpm why inflight
pnpm why querystring
pnpm why @xmldom/xmldom
```

## Notes

- Most of these are transitive dependencies (subdependencies of your dependencies)
- You cannot directly update them without updating parent packages
- Some may be resolved by updating Expo/React Native to latest versions
- Always test thoroughly after making changes


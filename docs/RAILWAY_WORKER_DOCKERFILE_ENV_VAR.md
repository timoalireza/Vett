# Fix Railway Worker Service Dockerfile Path

## Problem
Railway is using `apps/api/Dockerfile` for the `vett-worker` service instead of `apps/worker/Dockerfile`, causing the worker to run API code and encounter `mercurius` version mismatch errors.

## Solution: Use RAILWAY_DOCKERFILE_PATH Environment Variable

Railway supports the `RAILWAY_DOCKERFILE_PATH` environment variable to specify which Dockerfile to use for each service, overriding the `dockerfilePath` in `railway.json`.

### Steps:

1. **Go to Railway Dashboard**
   - Navigate to your `vett-worker` service
   - Click on the **"Variables"** tab (or **"Settings"** → **"Variables"**)

2. **Add Environment Variable**
   - Click **"New Variable"** or **"Raw Editor"**
   - Add the following:
     ```
     RAILWAY_DOCKERFILE_PATH=apps/worker/Dockerfile
     ```

3. **Save and Redeploy**
   - Save the environment variable
   - Railway will automatically trigger a new deployment
   - The worker service will now build using `apps/worker/Dockerfile`

### Why This Works

- `RAILWAY_DOCKERFILE_PATH` overrides the `dockerfilePath` specified in `railway.json`
- This allows each service to use its own Dockerfile without needing Root Directory configuration
- The build context remains the repository root, which is what both Dockerfiles expect

### Verification

After setting the environment variable and redeploying, check the Railway build logs:
- You should see: `[internal] load build definition from Dockerfile` pointing to `apps/worker/Dockerfile`
- The worker should build successfully without `mercurius` dependency errors
- Worker logs should show worker-specific startup messages, not API startup messages


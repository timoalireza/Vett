# Supabase Pricing Recommendation for Vett

## 📊 Plan Comparison

### Free Plan Limitations

**Storage:**
- 500 MB database storage
- 1 GB file storage
- 5 GB egress/month

**Features:**
- 50,000 monthly active users
- Community support only
- **⚠️ Projects pause after 1 week of inactivity** (CRITICAL)
- 2 active projects per organization

**Backups:**
- Basic backups (not guaranteed for free tier)

### Pro Plan ($25/month)

**Storage:**
- 8 GB database storage (expandable)
- 100 GB file storage
- 250 GB egress/month

**Features:**
- 100,000 MAUs (with overage charges)
- Email support
- **No project pausing** ✅
- Unlimited projects

**Backups:**
- Daily backups (7-day retention)
- 7-day log retention
- Point-in-time recovery

---

## 🎯 Recommendation: **Pro Plan for Production**

### Why Free Tier is NOT Sufficient for Production

1. **Project Pausing** ⚠️ CRITICAL
   - Free tier projects pause after 1 week of inactivity
   - Your production API will go offline if there's no activity
   - This is unacceptable for production

2. **Storage Limits**
   - 500 MB database: Too small for production
   - Each analysis with sources can be 50-200 KB
   - With 10,000 analyses ≈ 1-2 GB (exceeds free tier)
   - 1 GB file storage: Very limited for media uploads

3. **Egress Limits**
   - 5 GB/month ≈ ~170 MB/day
   - Your API responses, GraphQL queries, file downloads
   - Easy to exceed with moderate traffic

4. **No Production Support**
   - Community support only
   - No SLA guarantees
   - Critical issues may take days to resolve

5. **Backup Limitations**
   - No guaranteed backups on free tier
   - Risk of data loss

---

## 💡 Recommended Strategy

### Option 1: Pro Plan from Day 1 (Recommended)

**Cost:** $25/month (~$300/year)

**Benefits:**
- ✅ No project pausing
- ✅ Sufficient storage for launch (8 GB)
- ✅ Reliable backups (7-day retention)
- ✅ Email support
- ✅ Production-ready SLA
- ✅ Room to grow

**Best for:** Production launch with peace of mind

---

### Option 2: Free Tier for Staging, Pro for Production

**Cost:** $25/month (only production)

**Setup:**
1. Create **staging project** on Free tier
2. Create **production project** on Pro tier
3. Use staging for testing, production for users

**Benefits:**
- Save $25/month on staging
- Production has all guarantees
- Staging can pause (acceptable for testing)

**Best for:** Budget-conscious but production-focused

---

### Option 3: Start Free, Upgrade When Needed

**Cost:** $0 → $25/month when you hit limits

**When to Upgrade:**
- Approaching 500 MB database storage
- Approaching 5 GB egress/month
- Need production support
- **Before launch** (to avoid project pausing)

**Risks:**
- Project might pause if traffic is low initially
- Need to monitor usage closely
- Potential downtime during upgrade

**Best for:** MVP testing phase only

---

## 📈 Storage Estimates for Vett

### Database Storage (per 1,000 users)

**Assumptions:**
- Average user: 10 analyses/month
- Each analysis: ~50 KB (with sources, claims, steps)
- User data: ~2 KB per user
- Subscription data: ~1 KB per user

**Calculation:**
- 1,000 users × 10 analyses = 10,000 analyses
- 10,000 analyses × 50 KB = 500 MB
- User/subscription data: ~3 MB
- **Total: ~500 MB per 1,000 active users**

**Free Tier Capacity:**
- ~1,000 active users max
- Very tight for production

**Pro Tier Capacity:**
- ~16,000 active users (8 GB)
- Comfortable for launch and growth

### File Storage (per 1,000 users)

**Assumptions:**
- Average user uploads: 5 images/month
- Average image size: 500 KB

**Calculation:**
- 1,000 users × 5 images = 5,000 images
- 5,000 images × 500 KB = 2.5 GB

**Free Tier Capacity:**
- ~400 users max (1 GB limit)
- Insufficient for production

**Pro Tier Capacity:**
- ~20,000 users (100 GB)
- Plenty of room

---

## ✅ Final Recommendation

### **Start with Pro Plan ($25/month)**

**Reasons:**
1. **No project pausing** - Critical for production
2. **Sufficient storage** - 8 GB database, 100 GB files
3. **Reliable backups** - 7-day retention
4. **Production support** - Email support when needed
5. **Room to grow** - Can handle 10,000+ users
6. **Cost-effective** - Only $25/month (~$0.83/day)

**Alternative:** If budget is tight, use Free tier for staging/testing, but **always use Pro for production**.

---

## 🚀 Migration Path

### If Starting on Free Tier:

1. **Week 1-2:** Test on Free tier
2. **Before Launch:** Upgrade to Pro tier
3. **Monitor:** Track storage and egress usage
4. **Scale:** Upgrade storage as needed ($0.125/GB/month)

### Upgrade Process:

1. Go to Supabase Dashboard → Settings → Billing
2. Click "Upgrade to Pro"
3. Enter payment details
4. **No downtime** - upgrade is instant
5. Update connection string if needed (usually same)

---

## 💰 Cost Comparison

| Provider | Monthly Cost | Database | Storage | Backups | Support |
|----------|-------------|----------|---------|---------|---------|
| **Supabase Free** | $0 | 500 MB | 1 GB | Basic | Community |
| **Supabase Pro** | $25 | 8 GB | 100 GB | 7-day | Email |
| **AWS RDS (t3.small)** | ~$30 | 20 GB | N/A | Configurable | Paid |
| **Railway** | ~$5-20 | Variable | Variable | Daily | Email |

**Verdict:** Supabase Pro at $25/month is excellent value for production.

---

## 📋 Action Items

- [ ] **For Production:** Sign up for Supabase Pro ($25/month)
- [ ] **For Staging:** Use Free tier (acceptable to pause)
- [ ] Monitor storage usage monthly
- [ ] Set up alerts for approaching limits
- [ ] Plan upgrade path if exceeding Pro tier limits

---

**Bottom Line:** The free tier is **NOT sufficient for production** due to project pausing and storage limits. **Pro Plan ($25/month) is recommended** for production launch.


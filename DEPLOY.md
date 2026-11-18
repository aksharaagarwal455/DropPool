# DropPool: live karne ke steps

Database: MongoDB Atlas. API: Render. Client: Vercel. Sab free tier par.

## 0. Pehle (zaroori)
1. `server/src/config/campusMap.json` mein har hostel ke asli `lat`/`lng` bharo (abhi 0.0 hain,
   isliye har hostel "nearby" maana ja raha hai).
2. `npm run check:campus` chalao. Paas ke hostels 3-8 min dikhne chahiye, sab 0 nahi.
3. `.env` kabhi GitHub par push mat karo (`.gitignore` mein hai).

## 1. MongoDB Atlas
1. mongodb.com/atlas, free M0 cluster.
2. Database Access: user + password banao.
3. Network Access: `0.0.0.0/0` allow karo.
4. Connect, Drivers: `mongodb+srv://USER:PASSWORD@...` copy karo (PASSWORD apna daalo).

## 2. GitHub
```
git add .
git commit -m "deploy config"
git push
```
`git status` mein `.env` nahi dikhna chahiye.

## 3. Render (API)
1. render.com: New, Blueprint (ya Web Service), apna repo chuno. `render.yaml` automatically padh liya jayega.
2. In env vars ki value Render mein daalo:
   - `MONGO_URI` = Atlas string
   - `JWT_SECRET` = 24+ characters random
   - `COLLEGE_EMAIL_DOMAINS` = tumhara college domain
   - `HOSTELS` = `Shri Shanta Teertham Hostel,Shri Shanta Nikay,...` (campusMap.json ke naam jaisa)
   - `GEMINI_API_KEY` = AI Studio key (optional)
   - `CLIENT_ORIGIN` = abhi `http://localhost:5173` rehne do
3. Deploy. `https://<tumhara-api>.onrender.com/api/health` kholo, `"status":"ok"` aana chahiye.
4. Free plan par pehli request 30-50 sec leti hai. Demo se pehle site ek baar kholke jaga do.

## 4. Vercel (client)
1. vercel.com: Add New, Project, wahi repo. Root directory = repo root. `vercel.json` build settings le leta hai.
2. Environment Variable: `VITE_API_URL` = Render ka URL (aakhir mein `/` nahi).
3. Deploy. Vercel URL milega.

## 5. CORS
Render mein `CLIENT_ORIGIN` = Vercel URL (https ke saath), phir redeploy.
Preview + local ek saath chahiye to comma se alag karo.

## 6. Admin banao
1. Live site par register karo.
2. Laptop par (`.env` mein Atlas `MONGO_URI` ke saath):
   `npm run make-admin -w droppool-server -- tumhara@email.edu`
3. Logout/login karo. Phir real checkout screenshots dekh ke fee profiles update karo
   (`PUT /api/admin/fee-profiles/:platform`). Tab tak fees illustrative hain.

## 7. Final smoke test
Register, login, profile mein UPI ID, intent banao (prices ke saath), matching chalao,
pool banao, confirm, host real total daale, payments claim/confirm, completed.

# Complete Run Plan for DairyOS

## Step 1: Verify Database
- [ ] Check if dairy.db exists
- [ ] Run seed_db.py to initialize data

## Step 2: Start Backend
- [ ] Navigate to backend directory
- [ ] Activate virtual environment
- [ ] Run: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

## Step 3: Start Frontend
- [ ] Navigate to frontend directory  
- [ ] Run: `npm run dev`

## Step 4: Run Acceptance Tests
- [ ] Execute: `bash acceptance.sh`
- [ ] Verify all 11 tests pass

## Expected Results
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

## Login Credentials
- Admin: admin@dairy.com / admin123
- Users: user1@dairy.com - user10@dairy.com / password123


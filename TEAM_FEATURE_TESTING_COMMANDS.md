# Team-Based Polling Feature - Testing Commands

## 🚀 Quick Start - Run All Servers

### Terminal 1: MongoDB
```bash
# Start MongoDB daemon
mongod --dbpath /tmp/mongodb --bind_ip 127.0.0.1 --logpath /tmp/mongodb.log --fork

# Verify MongoDB is running
mongosh --eval "db.adminCommand('ping')"
```

### Terminal 2: Backend Server
```bash
cd /workspaces/spandan/backend
npm start
# Expected output: "Server running on port 3001"
# Look for: "MongoDB connected" and "Whisper model loaded"
```

### Terminal 3: Frontend Server
```bash
cd /workspaces/spandan/frontend
npm run dev
# Expected output: "VITE ... ready in ... ms"
# Frontend runs on http://localhost:5173
```

---

## 🧪 API Testing Commands

### 1. Health Check
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","mongodb":"connected",...}
```

### 2. Create a Test Room (Teacher)

```bash
# First, login as teacher
TEACHER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@example.com","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Teacher Token: $TEACHER_TOKEN"

# Create room
curl -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "name":"Team Quiz Test",
    "settings":{
      "teamsEnabled":true,
      "teamSettings":{
        "numberOfTeams":2,
        "teamFormation":"random"
      }
    }
  }'
```

### 3. Generate Random Teams

```bash
# Get room ID from previous command response, then:
ROOM_ID="your_room_id_here"

curl -X POST http://localhost:3001/api/teams/generate-random \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "roomId":"'$ROOM_ID'",
    "numberOfTeams":2,
    "teamFormation":"random"
  }'

# Expected: Array of 2 teams with members array
```

### 4. Get All Teams in Room

```bash
curl -X GET http://localhost:3001/api/teams/room/$ROOM_ID \
  -H "Authorization: Bearer $TEACHER_TOKEN"

# Expected: List of teams with members populated
```

### 5. Submit Team Vote

```bash
# Get team ID from previous response
TEAM_ID="your_team_id_here"
QUESTION_ID="your_question_id_here"

curl -X POST http://localhost:3001/api/team-responses/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{
    "roomId":"'$ROOM_ID'",
    "questionId":"'$QUESTION_ID'",
    "teamId":"'$TEAM_ID'",
    "selectedOption":1,
    "responseTime":5000
  }'

# Expected: TeamResponse with memberVotes array
```

### 6. Calculate Final Team Answer

```bash
curl -X POST http://localhost:3001/api/team-responses/calculate-final-answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "roomId":"'$ROOM_ID'",
    "questionId":"'$QUESTION_ID'",
    "teamId":"'$TEAM_ID'"
  }'

# Expected: Majority vote calculated, team score updated
```

### 7. Get Team Leaderboard

```bash
curl -X GET http://localhost:3001/api/teams/leaderboard/$ROOM_ID

# Expected: Ranked list of teams with scores
```

### 8. Get Specific Team Response

```bash
curl -X GET http://localhost:3001/api/team-responses/$ROOM_ID/$QUESTION_ID/$TEAM_ID

# Expected: Team's response with all member votes
```

---

## 📱 Frontend Testing - Manual Steps

### 1. Login as Teacher
- Navigate to http://localhost:5173
- Login with: `email: teacher@example.com`, `password: password123`

### 2. Create Room with Teams
- Click "Create Room"
- Enable "Use Teams"
- Set number of teams: 2
- Choose "Random Assignment"
- Create room

### 3. Import TeamSetup Component
```javascript
// In a page component
import TeamSetup from '../components/TeamSetup'

<TeamSetup roomId={roomId} onTeamsCreated={handleTeamsCreated} />
```

### 4. Test TeamDisplay Component
```javascript
import TeamDisplay from '../components/TeamDisplay'

<TeamDisplay teamId={teamId} roomId={roomId} />
```

### 5. Test TeamResponseVoting Component
```javascript
import TeamResponseVoting from '../components/TeamResponseVoting'

<TeamResponseVoting 
  teamId={teamId}
  roomId={roomId}
  questionId={questionId}
  question={currentQuestion}
  onAnswerSubmitted={handleAnswerSubmitted}
/>
```

### 6. Test TeamLeaderboard Component
```javascript
import TeamLeaderboard from '../components/TeamLeaderboard'

<TeamLeaderboard roomId={roomId} />
```

---

## 🔗 Socket.IO Event Testing

### Using wscat (WebSocket client)

```bash
# Install wscat globally
npm install -g wscat

# Connect to Socket.IO server
wscat -c "http://localhost:3001/socket.io/?transport=websocket"
```

### Test Events (in wscat terminal)

```javascript
// Authenticate
{"sid":"xxx","data":["authenticate",{"token":"your_jwt_token"}]}

// Join team
{"sid":"xxx","data":["team:join",{"teamId":"xxx","roomId":"xxx","userId":"xxx"}]}

// Submit vote
{"sid":"xxx","data":["team:vote-submitted",{
  "teamId":"xxx",
  "roomId":"xxx",
  "questionId":"xxx",
  "memberId":"xxx",
  "selectedOption":1,
  "responseTime":5000
}]}

// Request voting status
{"sid":"xxx","data":["team:request-voting-status",{
  "teamId":"xxx",
  "roomId":"xxx",
  "questionId":"xxx"
}]}

// Request leaderboard
{"sid":"xxx","data":["team:request-leaderboard",{"roomId":"xxx"}]}

// Submit team answer
{"sid":"xxx","data":["team:submit-answer",{
  "teamId":"xxx",
  "roomId":"xxx",
  "questionId":"xxx"
}]}

// Leave team
{"sid":"xxx","data":["team:leave",{"teamId":"xxx","userId":"xxx"}]}
```

---

## 🧬 Complete End-to-End Test Flow

### Script: Full Team Quiz Test

```bash
#!/bin/bash
set -e

echo "=== TEAM FEATURE E2E TEST ==="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Health check
echo -e "${BLUE}1. Health Check${NC}"
curl -s http://localhost:3001/api/health | jq .
echo ""

# 2. Login as teacher
echo -e "${BLUE}2. Login as Teacher${NC}"
TEACHER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"teacher@example.com",
    "password":"password123"
  }')

TEACHER_TOKEN=$(echo $TEACHER_RESPONSE | jq -r '.token')
TEACHER_ID=$(echo $TEACHER_RESPONSE | jq -r '.user._id')
echo "Teacher ID: $TEACHER_ID"
echo "Token: ${TEACHER_TOKEN:0:20}..."
echo ""

# 3. Create room
echo -e "${BLUE}3. Create Room${NC}"
ROOM_RESPONSE=$(curl -s -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "name":"Team Quiz Test Room",
    "settings":{
      "teamsEnabled":true,
      "teamSettings":{
        "numberOfTeams":2,
        "teamFormation":"random"
      }
    }
  }')

ROOM_ID=$(echo $ROOM_RESPONSE | jq -r '._id')
ROOM_CODE=$(echo $ROOM_RESPONSE | jq -r '.code')
echo "Room ID: $ROOM_ID"
echo "Room Code: $ROOM_CODE"
echo ""

# 4. Generate random teams
echo -e "${BLUE}4. Generate Random Teams${NC}"
TEAMS_RESPONSE=$(curl -s -X POST http://localhost:3001/api/teams/generate-random \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{
    "roomId":"'$ROOM_ID'",
    "numberOfTeams":2,
    "teamFormation":"random"
  }')

TEAM_1_ID=$(echo $TEAMS_RESPONSE | jq -r '.[0]._id')
TEAM_2_ID=$(echo $TEAMS_RESPONSE | jq -r '.[1]._id')
echo "Team 1 ID: $TEAM_1_ID"
echo "Team 2 ID: $TEAM_2_ID"
echo ""

# 5. Get teams
echo -e "${BLUE}5. Get All Teams${NC}"
curl -s -X GET http://localhost:3001/api/teams/room/$ROOM_ID \
  -H "Authorization: Bearer $TEACHER_TOKEN" | jq '.[].name'
echo ""

# 6. Get leaderboard
echo -e "${BLUE}6. Get Team Leaderboard${NC}"
curl -s -X GET http://localhost:3001/api/teams/leaderboard/$ROOM_ID | jq '.[] | {rank, teamName, totalScore}'
echo ""

echo -e "${GREEN}✓ All tests completed successfully!${NC}"
```

Save as `test-team-feature.sh` and run:
```bash
chmod +x test-team-feature.sh
./test-team-feature.sh
```

---

## 🐛 Debugging Commands

### Check Backend Logs
```bash
# If running in background
tail -f /tmp/backend.log

# Or check MongoDB logs
tail -f /tmp/mongodb.log
```

### MongoDB Queries

```bash
# Connect to MongoDB
mongosh

# In mongosh:

# View all teams
db.teams.find()

# View all team responses
db.teamresponses.find()

# Count teams in a room
db.teams.countDocuments({roomId: ObjectId("your_room_id")})

# View specific team
db.teams.findOne({_id: ObjectId("your_team_id")})

# Clear test data
db.teams.deleteMany({})
db.teamresponses.deleteMany({})
```

### Network/Socket.IO Debugging

```bash
# Check if Socket.IO is responding
curl -i -X GET http://localhost:3001/socket.io/?transport=polling

# Monitor network traffic (macOS/Linux)
tcpdump -i lo port 3001

# Or use nc to test connection
nc -zv localhost 3001
```

---

## ✅ Test Coverage Checklist

### Backend Tests
- [ ] Health endpoint working
- [ ] Create team succeeds (teacher)
- [ ] Create team fails for non-teacher
- [ ] Generate random teams creates correct count
- [ ] Teams have members assigned
- [ ] Add members to team works
- [ ] Remove member from team works
- [ ] Leaderboard returns ranked teams
- [ ] Vote submission creates TeamResponse
- [ ] Calculate final answer works
- [ ] Majority voting accurate (single choice)
- [ ] Majority voting accurate (multiple choice)
- [ ] Team score updates correctly

### Frontend Tests
- [ ] TeamSetup component renders
- [ ] Can input number of teams
- [ ] Can select team formation method
- [ ] Can submit team creation
- [ ] TeamDisplay shows team info
- [ ] TeamDisplay shows members
- [ ] TeamDisplay shows team score
- [ ] TeamResponseVoting renders options
- [ ] Can select options (MCQ)
- [ ] Can multi-select options (MSQ)
- [ ] Vote submission works
- [ ] Real-time vote display works
- [ ] TeamLeaderboard displays teams
- [ ] TeamLeaderboard shows rankings
- [ ] Leaderboard updates in real-time

### Socket.IO Tests
- [ ] Client can authenticate
- [ ] team:join event works
- [ ] team:vote-submitted event works
- [ ] team:submit-answer event works
- [ ] team:request-voting-status works
- [ ] team:request-leaderboard works
- [ ] team:member-joined broadcast works
- [ ] team:vote-updated broadcast works
- [ ] team:answer-submitted broadcast works
- [ ] team:leaderboard-updated broadcast works

---

## 🚨 Common Issues & Solutions

### Issue: "Teams not found" (404)
```bash
# Check if teams exist
mongosh -c "db.teams.find({roomId: ObjectId('your_room_id')})"

# Verify room has teamsEnabled flag
mongosh -c "db.rooms.find({_id: ObjectId('your_room_id')})"
```

### Issue: Votes not updating in real-time
```bash
# Check Socket.IO connection
curl -i http://localhost:3001/socket.io/?transport=polling

# Check browser console for Socket.IO errors
# Verify JWT token is being passed
```

### Issue: Wrong majority vote calculated
```bash
# Check member votes in TeamResponse
mongosh -c "db.teamresponses.findOne({teamId: ObjectId('your_team_id')})"

# Manually verify majority algorithm:
# If votes are [0, 0, 1], result should be 0 (appears 2 times)
```

### Issue: Team score not updating
```bash
# Check if calculateFinalAnswer was called
# Verify isCorrect is calculated correctly
# Check question.correctAnswer matches
mongosh -c "db.questions.findOne({_id: ObjectId('your_question_id')})"
```

---

## 📊 Performance Testing

### Load Test: Create Multiple Teams
```bash
#!/bin/bash
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/teams \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TEACHER_TOKEN" \
    -d '{"roomId":"'$ROOM_ID'","name":"Team '$i'"}' &
done
wait
echo "10 teams created in parallel"
```

### Load Test: Simulate Multiple Votes
```bash
#!/bin/bash
for i in {1..5}; do
  STUDENT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"student'$i'@example.com","password":"password123"}' \
    | jq -r '.token')
  
  curl -X POST http://localhost:3001/api/team-responses/vote \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $STUDENT_TOKEN" \
    -d '{
      "roomId":"'$ROOM_ID'",
      "questionId":"'$QUESTION_ID'",
      "teamId":"'$TEAM_ID'",
      "selectedOption":$((RANDOM % 4)),
      "responseTime":'$((RANDOM % 10000))'
    }' &
done
wait
echo "5 votes submitted in parallel"
```

---

## 📝 Notes

- All commands assume localhost development environment
- Replace placeholder IDs with actual IDs from responses
- Use `jq` for JSON parsing: `curl ... | jq '.field'`
- Some tests require existing test users in database
- Check logs if commands fail
- Use `-v` flag with curl for verbose output

---

**Last Updated:** 2025  
**Feature:** Team-Based Polling  
**Status:** Ready for Testing

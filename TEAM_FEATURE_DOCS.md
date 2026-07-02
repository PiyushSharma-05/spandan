# Team-Based Polling Feature Documentation

## Overview

The team-based polling feature enables teachers to organize students into teams for collaborative quiz participation. Teams answer questions together using a majority voting system, with team-level leaderboards replacing individual student rankings.

## Architecture

### Database Models

#### Team Model (`/backend/src/models/Team.js`)
- **roomId**: Reference to the room
- **name**: Team display name (e.g., "Team A")
- **members**: Array of student user IDs
- **teamScore**: Cumulative points across all questions
- **correctAnswers**: Count of correctly answered questions
- **totalQuestions**: Total questions the team has answered
- **timestamps**: Auto-managed `createdAt` and `updatedAt`

#### TeamResponse Model (`/backend/src/models/TeamResponse.js`)
- **roomId**: Room identifier
- **questionId**: Question being answered
- **teamId**: Team providing the answer
- **memberVotes**: Array of individual member votes with:
  - `memberId`: Student ID
  - `selectedOption`: Single choice selection
  - `selectedOptions`: Multiple choice selections (MSQ)
  - `responseTime`: Time to answer (ms)
  - `timestamp`: When vote was submitted
- **finalAnswer**: Team's majority-determined answer
- **finalAnswerMSQ**: Final answers for multiple-choice (array)
- **isCorrect**: Whether final answer was correct
- **teamScore**: Points earned for this question

### Room Model Update
Added to Room settings:
```javascript
teamsEnabled: Boolean,        // Enable/disable teams for this room
teamSettings: {
  numberOfTeams: Number,      // How many teams to create
  peoplePerTeam: Number,      // People per team (for random assignment)
  teamFormation: 'manual' | 'random'  // Assignment strategy
}
```

## API Endpoints

### Teams Management

**POST /api/teams**
- Create a single team manually
- Authorization: Teacher only
- Body: `{ roomId, name }`
- Returns: Created team object

**GET /api/teams/room/:roomId**
- List all teams in a room
- Returns: Array of team objects with populated members

**POST /api/teams/generate-random**
- Randomly assign all room students to teams
- Authorization: Teacher only
- Body: `{ roomId, numberOfTeams, teamFormation: 'random' }`
- Deletes existing teams and creates new ones
- Returns: Array of created teams

**POST /api/teams/:teamId/members**
- Add members to a team
- Authorization: Teacher only
- Body: `{ memberIds: [userId1, userId2, ...] }`
- Returns: Updated team with members

**DELETE /api/teams/:teamId/members/:memberId**
- Remove a member from a team
- Authorization: Teacher only
- Returns: Updated team

**GET /api/teams/leaderboard/:roomId**
- Get team standings sorted by score
- Returns: Array of teams with rankings and stats

### Team Responses

**POST /api/team-responses/vote**
- Submit a vote from a team member
- Body: `{ roomId, questionId, teamId, selectedOption, selectedOptions }`
- Returns: TeamResponse object with all votes

**POST /api/team-responses/calculate-final-answer**
- Calculate majority vote and finalize team answer
- Authorization: Teacher only
- Body: `{ roomId, questionId, teamId }`
- Updates team score if correct
- Returns: { teamResponse, team: { score, correctAnswers, totalQuestions } }

**GET /api/team-responses/:roomId/:questionId/:teamId**
- Get team response for a specific question
- Returns: TeamResponse with all member votes

**GET /api/team-responses/room/:roomId/question/:questionId**
- Get all team responses for a question
- Returns: Array of TeamResponse objects

## Socket.IO Events

### Client to Server

**team:join**
```javascript
{
  teamId: ObjectId,
  roomId: ObjectId,
  userId: ObjectId
}
```

**team:vote-submitted**
```javascript
{
  teamId: ObjectId,
  roomId: ObjectId,
  questionId: ObjectId,
  memberId: ObjectId,
  selectedOption: Number,
  selectedOptions: [Number],
  responseTime: Number
}
```

**team:submit-answer**
```javascript
{
  teamId: ObjectId,
  roomId: ObjectId,
  questionId: ObjectId
}
```

**team:request-voting-status**
```javascript
{
  teamId: ObjectId,
  roomId: ObjectId,
  questionId: ObjectId
}
```

**team:request-leaderboard**
```javascript
{
  roomId: ObjectId
}
```

**team:leave**
```javascript
{
  teamId: ObjectId,
  userId: ObjectId
}
```

### Server to Client

**team:member-joined**
- Broadcast when a team member joins: `{ teamId, userId, timestamp }`

**team:vote-updated**
- Notify team about new vote: `{ teamId, questionId, memberId, totalVotes, selectedOption, timestamp }`

**team:answer-submitted**
- Broadcast to room: `{ teamId, questionId, finalAnswer, isCorrect, teamScore, timestamp }`

**team:answer-finalized**
- Notify team: `{ finalAnswer, isCorrect, teamScore }`

**team:voting-status**
- Send voting update: `{ teamId, questionId, votes: [...], timestamp }`

**team:leaderboard-updated**
- Broadcast standings: `{ leaderboard: [...], timestamp }`

**team:member-left**
- Notify team: `{ teamId, userId, timestamp }`

## Frontend Components

### TeamSetup Component
- Accepts user input for team configuration
- Allows selecting number of teams and assignment method (manual/random)
- Calls API to create teams
- Props: `{ roomId, onTeamsCreated }`

### TeamDisplay Component
- Shows current user's team information
- Displays team members and current team score
- Props: `{ teamId, roomId }`

### TeamResponseVoting Component
- Voting interface for team answers
- Shows options and allows member to select their choice
- Displays real-time votes from other team members
- Handles both single-choice and multiple-choice questions
- Props: `{ teamId, roomId, questionId, question, onAnswerSubmitted }`

### TeamLeaderboard Component
- Displays team standings with scores and accuracy
- Updates in real-time via Socket.IO
- Ranked by total score and correct answers
- Props: `{ roomId }`

## Majority Voting Algorithm

### Single-Choice Questions (MCQ/True-False)
1. Collect all member votes
2. Count votes for each option
3. Select option with highest count (majority)
4. If tie, select first option encountered
5. Validate against question's correct answer

### Multiple-Choice Questions (MSQ)
1. Collect all member selections
2. Count occurrences of each option across all members
3. Create list of most-selected options (sorted by frequency)
4. Team answer is array of these options
5. Validate: team selection must match correct answer exactly (order-independent)

## Implementation Notes

### Scoring
- Base points per question: 10 (configurable via question.points)
- Team receives full points if majority answer is correct
- Individual member votes don't affect scoring (only team answer matters)

### Member Assignment
**Random Assignment Algorithm:**
- Shuffle all students in room
- Distribute round-robin across teams: student[0]→Team1, student[1]→Team2, ..., student[n]→TeamN, student[n+1]→Team1, etc.
- Ensures roughly equal team sizes

### Authorization
- Only teachers can create/modify teams
- Students can submit votes automatically
- Teachers can view team responses

### Real-time Updates
- Socket.IO used for live voting feedback
- Team members see votes as they arrive
- Leaderboard updates after each question answered

## Database Indexes
- **Team**: Index on `roomId` for room-specific team lookups
- **TeamResponse**: Unique index on `(roomId, questionId, teamId)`, separate index on `(roomId, teamId)`

## Integration with Existing Features

### Rooms
- Team settings stored in Room.settings.teamSettings
- Existing room functionality unchanged
- Teams optional (teamsEnabled flag)

### Questions
- Question endpoints unchanged
- Type checking (MCQ/MSQ/TF) in TeamResponseVoting calculation

### Responses
- Individual Response model still exists for non-team modes
- TeamResponse separate collection for team modes
- No breaking changes to existing response tracking

## Error Handling

### Common Error Cases
1. **Unauthorized**: Non-teacher creating teams → 403 Forbidden
2. **Team not found**: Invalid teamId → 404 Not Found
3. **No students in room**: Cannot create teams → 400 Bad Request
4. **Invalid vote**: Missing required fields → Validation error
5. **Timeout**: Long-running majority calculation → 504 Gateway Timeout

## Future Enhancements

### Potential Features
- Team name customization UI
- Custom points per question
- Voting time limits per team
- Tie-breaking rules (e.g., fastest team, teacher manual decision)
- Team chat during voting
- Intermediate results before final answer
- Team performance analytics dashboard
- Export team leaderboards

### Performance Optimizations
- Cache team rosters in-memory during active sessions
- Batch leaderboard updates instead of per-vote
- Implement pagination for large team lists
- Compress Socket.IO messages

## Testing Recommendations

### Unit Tests
- Majority voting algorithm with edge cases
- Team member deduplication in add-members endpoint
- Random assignment distribution

### Integration Tests
- Create teams → Add members → Submit votes → Calculate answer
- Multiple teams same question
- Team member vote changes
- Leaderboard ranking accuracy

### E2E Tests
- Teacher creates teams → Students join teams → Teams submit answers → Leaderboard updates
- Team formation with random assignment
- Real-time vote display during team discussion

## Troubleshooting

### Teams not appearing
- Check teamsEnabled flag in room settings
- Verify teams were created successfully
- Check user authentication

### Votes not updating
- Verify Socket.IO connection
- Check teamId matches current user's team
- Review browser console for errors

### Incorrect final answer
- Verify majority voting algorithm (check edge cases with even votes)
- Confirm question correctAnswer is set correctly
- Check memberVotes array population

---

Last Updated: 2025
Feature Version: 1.0

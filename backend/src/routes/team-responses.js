import express from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { z } from 'zod'
import TeamResponse from '../models/TeamResponse.js'
import Team from '../models/Team.js'
import Question from '../models/Question.js'
import Room from '../models/Room.js'

const router = express.Router()

// Validation schemas
const submitTeamVoteSchema = z.object({
  roomId: z.string(),
  questionId: z.string(),
  teamId: z.string(),
  selectedOption: z.number().optional(),
  selectedOptions: z.array(z.number()).optional()
})

// Submit a vote from a team member
router.post('/vote', authenticate, validate(submitTeamVoteSchema), async (req, res) => {
  try {
    const { roomId, questionId, teamId, selectedOption, selectedOptions } = req.body
    const studentId = req.user.id

    // Find or create team response
    let teamResponse = await TeamResponse.findOne({
      roomId,
      questionId,
      teamId
    })

    if (!teamResponse) {
      teamResponse = new TeamResponse({
        roomId,
        questionId,
        teamId,
        memberVotes: []
      })
    }

    // Check if this member already voted
    const existingVoteIndex = teamResponse.memberVotes.findIndex(
      v => v.memberId.toString() === studentId
    )

    const vote = {
      memberId: studentId,
      selectedOption,
      selectedOptions: selectedOptions || [],
      responseTime: Date.now(),
      timestamp: new Date()
    }

    if (existingVoteIndex >= 0) {
      // Update existing vote
      teamResponse.memberVotes[existingVoteIndex] = vote
    } else {
      // Add new vote
      teamResponse.memberVotes.push(vote)
    }

    await teamResponse.save()

    res.json(teamResponse)
  } catch (error) {
    console.error('Error submitting team vote:', error)
    res.status(500).json({ error: 'Failed to submit vote' })
  }
})

// Calculate team's final answer based on majority vote
router.post('/calculate-final-answer', authenticate, authorize('teacher'), async (req, res) => {
  try {
    const { roomId, questionId, teamId } = req.body

    const teamResponse = await TeamResponse.findOne({
      roomId,
      questionId,
      teamId
    })

    if (!teamResponse) {
      return res.status(404).json({ error: 'Team response not found' })
    }

    // Get the question to check answer type
    const question = await Question.findById(questionId)
    
    if (question.type === 'MSQ') {
      // For MSQ, calculate majority of selected options
      const optionCounts = {}
      teamResponse.memberVotes.forEach(vote => {
        vote.selectedOptions.forEach(opt => {
          optionCounts[opt] = (optionCounts[opt] || 0) + 1
        })
      })

      const finalAnswerArray = Object.keys(optionCounts)
        .map(opt => ({ opt: parseInt(opt), count: optionCounts[opt] }))
        .sort((a, b) => b.count - a.count)
        .map(item => item.opt)

      teamResponse.finalAnswerMSQ = finalAnswerArray
      
      // Check if correct
      const correctOptions = new Set(question.correctAnswer || [])
      teamResponse.isCorrect = finalAnswerArray.every(opt => correctOptions.has(opt)) &&
                                finalAnswerArray.length === correctOptions.size
    } else {
      // For single-choice questions, calculate majority vote
      const voteCounts = {}
      teamResponse.memberVotes.forEach(vote => {
        if (vote.selectedOption !== undefined) {
          voteCounts[vote.selectedOption] = (voteCounts[vote.selectedOption] || 0) + 1
        }
      })

      const finalAnswer = Object.keys(voteCounts)
        .map(opt => ({ opt: parseInt(opt), count: voteCounts[opt] }))
        .sort((a, b) => b.count - a.count)[0]?.opt || null

      teamResponse.finalAnswer = finalAnswer
      teamResponse.isCorrect = finalAnswer === question.correctAnswer
    }

    // Update team response and team stats
    await teamResponse.save()

    // Update team score
    const team = await Team.findById(teamId)
    if (teamResponse.isCorrect) {
      team.correctAnswers += 1
      team.teamScore += 10 // Default points, can be configured
    }
    team.totalQuestions += 1
    await team.save()

    res.json({
      teamResponse,
      team: {
        score: team.teamScore,
        correctAnswers: team.correctAnswers,
        totalQuestions: team.totalQuestions
      }
    })
  } catch (error) {
    console.error('Error calculating final answer:', error)
    res.status(500).json({ error: 'Failed to calculate final answer' })
  }
})

// Get team response for a question
router.get('/:roomId/:questionId/:teamId', authenticate, async (req, res) => {
  try {
    const { roomId, questionId, teamId } = req.params

    const teamResponse = await TeamResponse.findOne({
      roomId,
      questionId,
      teamId
    }).populate('memberVotes.memberId', 'name email')

    if (!teamResponse) {
      return res.status(404).json({ error: 'Team response not found' })
    }

    res.json(teamResponse)
  } catch (error) {
    console.error('Error fetching team response:', error)
    res.status(500).json({ error: 'Failed to fetch team response' })
  }
})

// Get all team responses for a room and question
router.get('/room/:roomId/question/:questionId', authenticate, async (req, res) => {
  try {
    const { roomId, questionId } = req.params

    const teamResponses = await TeamResponse.find({
      roomId,
      questionId
    }).populate('teamId', 'name members')

    res.json(teamResponses)
  } catch (error) {
    console.error('Error fetching team responses:', error)
    res.status(500).json({ error: 'Failed to fetch team responses' })
  }
})

export default router

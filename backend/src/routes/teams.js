import express from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { z } from 'zod'
import Team from '../models/Team.js'
import TeamResponse from '../models/TeamResponse.js'
import Room from '../models/Room.js'
import User from '../models/User.js'

const router = express.Router()

// Validation schemas
const createTeamSchema = z.object({
  roomId: z.string(),
  name: z.string().min(1, 'Team name is required')
})

const addMembersSchema = z.object({
  memberIds: z.array(z.string())
})

const generateTeamsSchema = z.object({
  roomId: z.string(),
  numberOfTeams: z.number().min(1),
  teamFormation: z.enum(['random'])
})

// Create a team
router.post('/', authenticate, authorize('teacher'), validate(createTeamSchema), async (req, res) => {
  try {
    const { roomId, name } = req.body
    
    // Verify teacher owns the room
    const room = await Room.findById(roomId)
    if (!room || room.teacher.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const team = new Team({
      roomId,
      name,
      members: []
    })

    await team.save()
    res.status(201).json(team)
  } catch (error) {
    console.error('Error creating team:', error)
    res.status(500).json({ error: 'Failed to create team' })
  }
})

// Get all teams in a room
router.get('/room/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params

    const teams = await Team.find({ roomId })
      .populate('members', 'name email role')
      .sort({ createdAt: 1 })

    res.json(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    res.status(500).json({ error: 'Failed to fetch teams' })
  }
})

// Add members to a team
router.post('/:teamId/members', authenticate, authorize('teacher'), validate(addMembersSchema), async (req, res) => {
  try {
    const { teamId } = req.params
    const { memberIds } = req.body

    const team = await Team.findById(teamId)
    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    // Verify teacher owns the room
    const room = await Room.findById(team.roomId)
    if (room.teacher.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Add members (avoid duplicates)
    const existingIds = team.members.map(m => m.toString())
    const newIds = memberIds.filter(id => !existingIds.includes(id))
    
    team.members.push(...newIds)
    await team.save()

    const updatedTeam = await team.populate('members', 'name email role')
    res.json(updatedTeam)
  } catch (error) {
    console.error('Error adding members to team:', error)
    res.status(500).json({ error: 'Failed to add members' })
  }
})

// Remove member from team
router.delete('/:teamId/members/:memberId', authenticate, authorize('teacher'), async (req, res) => {
  try {
    const { teamId, memberId } = req.params

    const team = await Team.findById(teamId)
    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    // Verify teacher owns the room
    const room = await Room.findById(team.roomId)
    if (room.teacher.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    team.members = team.members.filter(m => m.toString() !== memberId)
    await team.save()

    const updatedTeam = await team.populate('members', 'name email role')
    res.json(updatedTeam)
  } catch (error) {
    console.error('Error removing member:', error)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

// Generate random teams
router.post('/generate-random', authenticate, authorize('teacher'), validate(generateTeamsSchema), async (req, res) => {
  try {
    const { roomId, numberOfTeams } = req.body

    // Verify teacher owns the room
    const room = await Room.findById(roomId)
    if (!room || room.teacher.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Delete existing teams for this room
    await Team.deleteMany({ roomId })

    // Get all students in the room
    const RoomMember = (await import('../models/RoomMember.js')).default
    const roomMembers = await RoomMember.find({ roomId }).populate('studentId')
    
    const studentIds = roomMembers.map(m => m.studentId._id)
    
    if (studentIds.length === 0) {
      return res.status(400).json({ error: 'No students in room' })
    }

    // Shuffle students
    const shuffled = [...studentIds].sort(() => 0.5 - Math.random())

    // Create teams
    const teams = []
    for (let i = 0; i < numberOfTeams; i++) {
      const teamMembers = []
      for (let j = 0; j * numberOfTeams + i < shuffled.length; j++) {
        const index = j * numberOfTeams + i
        if (index < shuffled.length) {
          teamMembers.push(shuffled[index])
        }
      }

      if (teamMembers.length > 0) {
        const team = new Team({
          roomId,
          name: `Team ${i + 1}`,
          members: teamMembers
        })
        await team.save()
        teams.push(await team.populate('members', 'name email role'))
      }
    }

    res.status(201).json(teams)
  } catch (error) {
    console.error('Error generating random teams:', error)
    res.status(500).json({ error: 'Failed to generate teams' })
  }
})

// Get team leaderboard
router.get('/leaderboard/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params

    const teams = await Team.find({ roomId })
      .populate('members', 'name email')
      .sort({ teamScore: -1, correctAnswers: -1 })

    const leaderboard = teams.map((team, index) => ({
      rank: index + 1,
      teamId: team._id,
      teamName: team.name,
      members: team.members,
      totalScore: team.teamScore,
      correctAnswers: team.correctAnswers,
      totalQuestions: team.totalQuestions,
      accuracy: team.totalQuestions > 0 ? ((team.correctAnswers / team.totalQuestions) * 100).toFixed(2) : 0
    }))

    res.json(leaderboard)
  } catch (error) {
    console.error('Error fetching team leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

export default router

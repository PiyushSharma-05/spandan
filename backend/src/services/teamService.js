/**
 * Team-based Socket.IO event handlers
 * Handles real-time team coordination including voting, answer submission, and updates
 */

import Team from '../models/Team.js'
import TeamResponse from '../models/TeamResponse.js'
import Question from '../models/Question.js'

export function setupTeamEvents(io, socket) {
  /**
   * Join a team room for real-time collaboration
   */
  socket.on('team:join', async (data) => {
    try {
      const { teamId, roomId, userId } = data
      
      // Verify user is in the team
      const team = await Team.findById(teamId)
      if (!team || !team.members.includes(userId)) {
        socket.emit('error', { message: 'Unauthorized' })
        return
      }

      // Join socket room for this team
      const teamRoom = `team:${teamId}`
      socket.join(teamRoom)

      // Notify team members
      io.to(teamRoom).emit('team:member-joined', {
        teamId,
        userId,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error joining team:', error)
      socket.emit('error', { message: 'Failed to join team' })
    }
  })

  /**
   * Team member submits a vote on the current question
   */
  socket.on('team:vote-submitted', async (data) => {
    try {
      const { teamId, roomId, questionId, memberId, selectedOption, selectedOptions, responseTime } = data

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

      // Update or add vote
      const existingVoteIndex = teamResponse.memberVotes.findIndex(
        v => v.memberId.toString() === memberId
      )

      const vote = {
        memberId,
        selectedOption,
        selectedOptions: selectedOptions || [],
        responseTime,
        timestamp: new Date()
      }

      if (existingVoteIndex >= 0) {
        teamResponse.memberVotes[existingVoteIndex] = vote
      } else {
        teamResponse.memberVotes.push(vote)
      }

      await teamResponse.save()

      // Notify team about the vote
      const teamRoom = `team:${teamId}`
      io.to(teamRoom).emit('team:vote-updated', {
        teamId,
        questionId,
        memberId,
        totalVotes: teamResponse.memberVotes.length,
        selectedOption,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error submitting team vote:', error)
      socket.emit('error', { message: 'Failed to submit vote' })
    }
  })

  /**
   * Calculate and submit final team answer based on majority vote
   */
  socket.on('team:submit-answer', async (data) => {
    try {
      const { teamId, roomId, questionId } = data

      const teamResponse = await TeamResponse.findOne({
        roomId,
        questionId,
        teamId
      })

      if (!teamResponse) {
        socket.emit('error', { message: 'Team response not found' })
        return
      }

      const question = await Question.findById(questionId)
      let finalAnswer = null
      let isCorrect = false

      if (question.type === 'MSQ') {
        // Calculate majority of selected options
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
        
        const correctOptions = new Set(question.correctAnswer || [])
        isCorrect = finalAnswerArray.every(opt => correctOptions.has(opt)) &&
                   finalAnswerArray.length === correctOptions.size
        finalAnswer = finalAnswerArray
      } else {
        // Calculate majority vote for single-choice questions
        const voteCounts = {}
        teamResponse.memberVotes.forEach(vote => {
          if (vote.selectedOption !== undefined) {
            voteCounts[vote.selectedOption] = (voteCounts[vote.selectedOption] || 0) + 1
          }
        })

        finalAnswer = Object.keys(voteCounts)
          .map(opt => ({ opt: parseInt(opt), count: voteCounts[opt] }))
          .sort((a, b) => b.count - a.count)[0]?.opt || null

        isCorrect = finalAnswer === question.correctAnswer
      }

      teamResponse.finalAnswer = finalAnswer
      teamResponse.isCorrect = isCorrect
      await teamResponse.save()

      // Update team stats
      const team = await Team.findById(teamId)
      if (isCorrect) {
        team.correctAnswers += 1
        team.teamScore += question.points || 10
      }
      team.totalQuestions += 1
      await team.save()

      // Broadcast to entire room about team answer
      const roomSocket = `room:${roomId}`
      io.to(roomSocket).emit('team:answer-submitted', {
        teamId,
        questionId,
        finalAnswer,
        isCorrect,
        teamScore: team.teamScore,
        timestamp: new Date()
      })

      // Notify team
      const teamRoom = `team:${teamId}`
      io.to(teamRoom).emit('team:answer-finalized', {
        finalAnswer,
        isCorrect,
        teamScore: team.teamScore
      })
    } catch (error) {
      console.error('Error submitting team answer:', error)
      socket.emit('error', { message: 'Failed to submit answer' })
    }
  })

  /**
   * Request live voting update for entire team
   */
  socket.on('team:request-voting-status', async (data) => {
    try {
      const { teamId, roomId, questionId } = data

      const teamResponse = await TeamResponse.findOne({
        roomId,
        questionId,
        teamId
      }).populate('memberVotes.memberId', 'name email')

      const teamRoom = `team:${teamId}`
      io.to(teamRoom).emit('team:voting-status', {
        teamId,
        questionId,
        votes: teamResponse ? teamResponse.memberVotes : [],
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error getting voting status:', error)
    }
  })

  /**
   * Update team leaderboard for all members
   */
  socket.on('team:request-leaderboard', async (data) => {
    try {
      const { roomId } = data

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
        accuracy: team.totalQuestions > 0 ? 
          ((team.correctAnswers / team.totalQuestions) * 100).toFixed(2) : 0
      }))

      const roomSocket = `room:${roomId}`
      io.to(roomSocket).emit('team:leaderboard-updated', {
        leaderboard,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error fetching team leaderboard:', error)
    }
  })

  /**
   * Team member leaves
   */
  socket.on('team:leave', async (data) => {
    try {
      const { teamId, userId } = data

      const teamRoom = `team:${teamId}`
      socket.leave(teamRoom)

      io.to(teamRoom).emit('team:member-left', {
        teamId,
        userId,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error leaving team:', error)
    }
  })
}

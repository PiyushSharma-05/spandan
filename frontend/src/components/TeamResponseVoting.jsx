import React, { useState, useEffect } from 'react'
import { useSocketStore } from '../stores/socketStore'
import { api } from '../lib/api'

export default function TeamResponseVoting({
  teamId,
  roomId,
  questionId,
  question,
  onAnswerSubmitted
}) {
  const [selectedOption, setSelectedOption] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [teamVotes, setTeamVotes] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const socket = useSocketStore((state) => state.socket)

  useEffect(() => {
    // Listen for team voting updates
    if (socket) {
      socket.on('team:vote-updated', (data) => {
        if (data.teamId === teamId && data.questionId === questionId) {
          fetchTeamVotes()
        }
      })

      return () => {
        socket.off('team:vote-updated')
      }
    }
  }, [socket, teamId, questionId])

  const fetchTeamVotes = async () => {
    try {
      const response = await api.get(
        `/team-responses/${roomId}/${questionId}/${teamId}`
      )
      setTeamVotes(response.data.memberVotes || [])
    } catch (error) {
      console.error('Error fetching team votes:', error)
    }
  }

  const handleToggleOption = (index) => {
    if (question.type === 'MSQ') {
      setSelectedOptions((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      )
    } else {
      setSelectedOption(index)
    }
  }

  const handleSubmitVote = async () => {
    try {
      setSubmitting(true)

      const voteData = {
        roomId,
        questionId,
        teamId,
        selectedOption: question.type !== 'MSQ' ? selectedOption : undefined,
        selectedOptions: question.type === 'MSQ' ? selectedOptions : undefined
      }

      await api.post('/team-responses/vote', voteData)

      // Emit socket event
      if (socket) {
        socket.emit('team:vote-submitted', {
          teamId,
          roomId,
          questionId,
          selectedOption,
          selectedOptions,
          responseTime: Date.now()
        })
      }

      setSubmitted(true)
      await fetchTeamVotes()

      setTimeout(() => onAnswerSubmitted?.(), 2000)
    } catch (error) {
      console.error('Error submitting vote:', error)
      alert('Failed to submit vote')
    } finally {
      setSubmitting(false)
    }
  }

  if (!question) {
    return null
  }

  const isMSQ = question.type === 'MSQ'
  const isAnswered = submitted || selectedOption !== null || selectedOptions.length > 0

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">
        {question.text}
      </h3>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options?.map((option, index) => (
          <label
            key={index}
            className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition"
          >
            <input
              type={isMSQ ? 'checkbox' : 'radio'}
              checked={
                isMSQ
                  ? selectedOptions.includes(index)
                  : selectedOption === index
              }
              onChange={() => handleToggleOption(index)}
              disabled={submitting || submitted}
              className="w-4 h-4"
            />
            <span className="ml-3 text-gray-700">{option}</span>
          </label>
        ))}
      </div>

      {/* Team Votes Display */}
      {teamVotes.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Team Votes ({teamVotes.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {teamVotes.map((vote) => (
              <span
                key={vote.memberId}
                className="text-xs bg-white px-2 py-1 rounded border border-blue-300 text-blue-700"
              >
                {vote.memberId?.name || 'Unknown'} ✓
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmitVote}
        disabled={!isAnswered || submitting || submitted}
        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold"
      >
        {submitted ? '✓ Vote Submitted' : 'Submit Your Vote'}
      </button>

      {submitted && (
        <p className="text-sm text-green-600 mt-2 text-center">
          Your vote has been recorded for the team!
        </p>
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useSocketStore } from '../stores/socketStore'
import { api } from '../lib/api'

export default function TeamLeaderboard({ roomId }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const socket = useSocketStore((state) => state.socket)

  useEffect(() => {
    fetchLeaderboard()

    // Listen for leaderboard updates
    if (socket) {
      socket.on('team:leaderboard-updated', (data) => {
        setTeams(data.leaderboard)
      })

      return () => {
        socket.off('team:leaderboard-updated')
      }
    }
  }, [socket, roomId])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/teams/leaderboard/${roomId}`)
      setTeams(response.data)
    } catch (error) {
      console.error('Error fetching team leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading leaderboard...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Team Leaderboard</h2>

      {teams.length === 0 ? (
        <p className="text-gray-600">No teams yet</p>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <div
              key={team.teamId}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200"
            >
              <div className="flex items-center flex-1">
                {/* Rank Badge */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold mr-4">
                  {team.rank}
                </div>

                {/* Team Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {team.teamName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {team.members?.length || 0} members
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 items-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">
                    {team.correctAnswers}
                  </div>
                  <div className="text-xs text-gray-600">Correct</div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">
                    {team.accuracy}%
                  </div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {team.totalScore}
                  </div>
                  <div className="text-xs text-gray-600">Points</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchLeaderboard}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
      >
        Refresh
      </button>
    </div>
  )
}

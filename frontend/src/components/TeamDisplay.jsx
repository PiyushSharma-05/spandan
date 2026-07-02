import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function TeamDisplay({ teamId, roomId }) {
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await api.get(`/teams/room/${roomId}`)
        const currentTeam = response.data.find(t => t._id === teamId)
        setTeam(currentTeam)
      } catch (error) {
        console.error('Error fetching team:', error)
      } finally {
        setLoading(false)
      }
    }

    if (teamId && roomId) {
      fetchTeam()
    }
  }, [teamId, roomId])

  if (loading) {
    return <div className="text-gray-500">Loading team info...</div>
  }

  if (!team) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{team.name}</h3>
          <p className="text-sm text-gray-600">
            {team.members?.length || 0} Members
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">{team.teamScore || 0}</div>
          <div className="text-xs text-gray-600">Team Score</div>
        </div>
      </div>

      {team.members && team.members.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-gray-600 mb-2">Team Members:</p>
          <div className="flex flex-wrap gap-2">
            {team.members.map((member) => (
              <span
                key={member._id}
                className="inline-block bg-white text-xs text-gray-700 px-2 py-1 rounded-full border border-blue-200"
              >
                {member.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

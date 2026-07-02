import React, { useState } from 'react'
import { api } from '../lib/api'

export default function TeamSetup({ roomId, onTeamsCreated }) {
  const [numberOfTeams, setNumberOfTeams] = useState(2)
  const [teamFormation, setTeamFormation] = useState('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerateRandomTeams = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.post('/teams/generate-random', {
        roomId,
        numberOfTeams,
        teamFormation: 'random'
      })

      onTeamsCreated(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate teams')
      console.error('Error generating teams:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
      <h2 className="text-2xl font-bold mb-4">Configure Teams</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Teams
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={numberOfTeams}
            onChange={(e) => setNumberOfTeams(parseInt(e.target.value))}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team Formation Method
          </label>
          <select
            value={teamFormation}
            onChange={(e) => setTeamFormation(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="manual">Manual Assignment</option>
            <option value="random">Random Assignment</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerateRandomTeams}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Creating Teams...' : 'Create Teams'}
        </button>
      </div>
    </div>
  )
}

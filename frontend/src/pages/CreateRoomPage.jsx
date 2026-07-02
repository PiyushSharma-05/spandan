import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useRoomStore from '../stores/roomStore'
import useSocketStore from '../stores/socketStore'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import ProfileDropdown from '../components/ProfileDropdown'

function CreateRoomPage() {
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const { createRoom, setAuthToken } = useRoomStore()
  
  const [roomName, setRoomName] = useState('')
  const [teamsEnabled, setTeamsEnabled] = useState(false)
  const [numberOfTeams, setNumberOfTeams] = useState(2)
  const [teamFormation, setTeamFormation] = useState('random')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (token) {
      setAuthToken(token)
    }
  }, [token])

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name')
      return
    }
    
    setIsCreating(true)
    setError('')
    
    try {
      const settings = {
        teamsEnabled: teamsEnabled,
        teamSettings: teamsEnabled ? {
          numberOfTeams: numberOfTeams,
          teamFormation: teamFormation
        } : {}
      }
      const room = await createRoom(roomName.trim(), settings)
      navigate(`/teacher/room/${room._id}`)
    } catch (err) {
      setError(err.message || 'Failed to create room')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <Sidebar user={user} />
      
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginLeft: '240px'
      }}>
        {/* Header */}
        <header style={{
          background: 'var(--header-bg)',
          color: 'white',
          padding: '24px 32px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                Create New Room
              </h1>
              <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '14px' }}>
                Create a new room for your students
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <ThemeToggle />
              <ProfileDropdown />
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, padding: '32px' }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: 'var(--card-shadow)',
            border: '1px solid var(--border-color)',
            maxWidth: '600px'
          }}>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Room Details
            </h2>
            
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              />
            </div>

            {/* Teams Section */}
            <div style={{ 
              marginBottom: '24px',
              padding: '16px',
              background: 'var(--bg-primary)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={teamsEnabled}
                    onChange={(e) => setTeamsEnabled(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  👥 Enable Team Mode
                </label>
              </div>

              {teamsEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                      marginBottom: '6px'
                    }}>
                      Number of Teams
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={numberOfTeams}
                      onChange={(e) => setNumberOfTeams(parseInt(e.target.value) || 2)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                      marginBottom: '6px'
                    }}>
                      Team Formation
                    </label>
                    <select
                      value={teamFormation}
                      onChange={(e) => setTeamFormation(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="random">🔀 Random Assignment</option>
                      <option value="manual">✋ Manual Assignment</option>
                    </select>
                  </div>

                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '8px 0 0',
                    lineHeight: '1.4'
                  }}>
                    📌 With team mode enabled, students will be divided into teams. Teams answer questions together using majority voting!
                  </p>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCreateRoom}
                disabled={isCreating || !roomName.trim()}
                style={{
                  padding: '14px 28px',
                  background: (isCreating || !roomName.trim()) ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (isCreating || !roomName.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </button>
              <button
                onClick={() => navigate('/teacher')}
                style={{
                  padding: '14px 28px',
                  background: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateRoomPage
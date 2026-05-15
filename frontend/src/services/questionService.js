import api from '../lib/api'
import useAuthStore from '../stores/authStore'

// Get available AI providers
export const getAIProviders = async () => {
  const token = useAuthStore.getState().token
  const response = await fetch('/api/questions/providers', {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  })
  const data = await response.json()
  return data
}

// Generate questions from transcript
export const generateQuestions = async (transcript, config) => {
  const response = await fetch('/api/questions/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${useAuthStore.getState().token}`
    },
    body: JSON.stringify({ transcript, config })
  })
  return response.json()
}
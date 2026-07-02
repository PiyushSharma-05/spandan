import mongoose from 'mongoose'

const teamResponseSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  // Individual member votes within the team
  memberVotes: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    selectedOption: Number,
    selectedOptions: [Number], // For MSQ
    responseTime: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Final team answer (determined by majority vote)
  finalAnswer: {
    type: Number,
    default: null
  },
  finalAnswerMSQ: {
    type: [Number],
    default: []
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  teamScore: {
    type: Number,
    default: 0
  },
  answerTime: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Index for fast lookups
teamResponseSchema.index({ roomId: 1, questionId: 1, teamId: 1 }, { unique: true })
teamResponseSchema.index({ roomId: 1, teamId: 1 })

const TeamResponse = mongoose.model('TeamResponse', teamResponseSchema)

export default TeamResponse

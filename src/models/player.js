import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },
    totalQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },
    wrongAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    playedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PlayerSchema.index(
  { correctAnswers: -1, wrongAnswers: 1, timeTakenSeconds: 1, playedAt: 1 },
  { name: "leaderboard_sort_index" }
);

const Player = mongoose.models.Player || mongoose.model("Player", PlayerSchema);

export default Player;

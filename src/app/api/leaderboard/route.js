import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Player from "@/models/player";

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 50);
    const onlyPerfect = searchParams.get("onlyPerfect") === "true";

    const filter = onlyPerfect
      ? {
          totalQuestions: { $gt: 0 },
          $expr: { $eq: ["$correctAnswers", "$totalQuestions"] },
        }
      : {};

    const players = await Player.find(filter)
      .sort({ correctAnswers: -1, wrongAnswers: 1, timeTakenSeconds: 1, playedAt: 1 })
      .limit(limit)
      .lean();

    const leaderboard = players.map((player, index) => ({
      rank: index + 1,
      id: player._id,
      name: player.name,
      totalQuestions: player.totalQuestions,
      correctAnswers: player.correctAnswers,
      wrongAnswers: player.wrongAnswers,
      timeTakenSeconds: player.timeTakenSeconds ?? 0,
      playedAt: player.playedAt,
      isPerfectScore:
        player.totalQuestions > 0 &&
        player.correctAnswers === player.totalQuestions,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch leaderboard.", detail: error.message },
      { status: 500 }
    );
  }
}

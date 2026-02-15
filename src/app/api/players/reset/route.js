import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Player from "@/models/player";

export async function POST() {
  try {
    await connectToDatabase();

    const result = await Player.updateMany(
      {},
      {
        $set: {
          totalQuestions: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          timeTakenSeconds: 0,
          playedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Player stats reset successfully.",
      matchedCount: result.matchedCount ?? 0,
      modifiedCount: result.modifiedCount ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reset player stats.", detail: error.message },
      { status: 500 }
    );
  }
}

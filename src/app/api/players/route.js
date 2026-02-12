import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Player from "@/models/player";

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    const totalQuestions = Math.max(0, toInt(body?.totalQuestions, 0));
    const correctAnswers = Math.max(0, toInt(body?.correctAnswers, 0));
    const wrongAnswers = Math.max(0, toInt(body?.wrongAnswers, 0));

    if (correctAnswers + wrongAnswers > totalQuestions && totalQuestions > 0) {
      return NextResponse.json(
        { error: "correctAnswers + wrongAnswers cannot exceed totalQuestions." },
        { status: 400 }
      );
    }

    const player = await Player.create({
      name,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      playedAt: body?.playedAt ? new Date(body.playedAt) : undefined,
    });

    return NextResponse.json(
      {
        id: player._id,
        name: player.name,
        totalQuestions: player.totalQuestions,
        correctAnswers: player.correctAnswers,
        wrongAnswers: player.wrongAnswers,
        playedAt: player.playedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create player record.", detail: error.message },
      { status: 500 }
    );
  }
}

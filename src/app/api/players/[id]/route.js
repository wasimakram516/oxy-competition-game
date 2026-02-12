import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Player from "@/models/player";

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();

    const { id } = await Promise.resolve(params);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid player id." }, { status: 400 });
    }

    const body = await request.json();
    const updates = {};

    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Name cannot be empty." },
          { status: 400 }
        );
      }
      updates.name = name;
    }

    if (body?.totalQuestions !== undefined) {
      updates.totalQuestions = Math.max(0, toInt(body.totalQuestions, 0));
    }

    if (body?.correctAnswers !== undefined) {
      updates.correctAnswers = Math.max(0, toInt(body.correctAnswers, 0));
    }

    if (body?.wrongAnswers !== undefined) {
      updates.wrongAnswers = Math.max(0, toInt(body.wrongAnswers, 0));
    }

    if (body?.playedAt !== undefined) {
      updates.playedAt = new Date(body.playedAt);
    }

    const existing = await Player.findById(id);

    if (!existing) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    const merged = {
      totalQuestions:
        updates.totalQuestions !== undefined
          ? updates.totalQuestions
          : existing.totalQuestions,
      correctAnswers:
        updates.correctAnswers !== undefined
          ? updates.correctAnswers
          : existing.correctAnswers,
      wrongAnswers:
        updates.wrongAnswers !== undefined
          ? updates.wrongAnswers
          : existing.wrongAnswers,
    };

    if (
      merged.totalQuestions > 0 &&
      merged.correctAnswers + merged.wrongAnswers > merged.totalQuestions
    ) {
      return NextResponse.json(
        { error: "correctAnswers + wrongAnswers cannot exceed totalQuestions." },
        { status: 400 }
      );
    }

    Object.assign(existing, updates);
    await existing.save();

    return NextResponse.json({
      id: existing._id,
      name: existing.name,
      totalQuestions: existing.totalQuestions,
      correctAnswers: existing.correctAnswers,
      wrongAnswers: existing.wrongAnswers,
      playedAt: existing.playedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update player record.", detail: error.message },
      { status: 500 }
    );
  }
}

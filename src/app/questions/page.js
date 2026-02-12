"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import questions from "@/data/questions.json";

const FEEDBACK_DELAY_MS = 850;

function shuffleQuestions(list) {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export default function QuestionsPage() {
  const router = useRouter();
  const playerId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("playerId")
      : null;

  const [randomizedQuestions] = useState(() => shuffleQuestions(questions));
  const [leaders, setLeaders] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [endSummary, setEndSummary] = useState(null);

  const correctAudioRef = useRef(null);
  const wrongAudioRef = useRef(null);
  const celebrateAudioRef = useRef(null);

  const currentQuestion = useMemo(
    () => randomizedQuestions[questionIndex] ?? null,
    [questionIndex, randomizedQuestions]
  );
  const totalQuestions = randomizedQuestions.length;

  useEffect(() => {
    correctAudioRef.current = new Audio("/correct.wav");
    wrongAudioRef.current = new Audio("/wrong.wav");
    celebrateAudioRef.current = new Audio("/celebrate.mp3");
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      try {
        const response = await fetch("/api/leaderboard?onlyPerfect=true&limit=6");
        const data = await response.json();
        if (isMounted) {
          setLeaders(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
        }
      } catch {
        if (isMounted) {
          setLeaders([]);
        }
      }
    }

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const leaderboardRows = useMemo(() => {
    const rows = leaders.slice(0, 6).map((entry) => entry.name);
    while (rows.length < 6) {
      rows.push("----");
    }
    return rows;
  }, [leaders]);

  async function updatePlayerRecord(finalCorrectCount) {
    if (!playerId) {
      return;
    }

    try {
      await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalQuestions,
          correctAnswers: finalCorrectCount,
          wrongAnswers: totalQuestions - finalCorrectCount,
          playedAt: new Date().toISOString(),
        }),
      });
    } catch {
      // ignore update failures for now and keep UX moving
    }
  }

  function playAudio(audioRef) {
    const sound = audioRef.current;
    if (!sound) {
      return;
    }
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  function burstConfetti() {
    confetti({
      particleCount: 140,
      spread: 90,
      startVelocity: 42,
      origin: { x: 0.5, y: 0.65 },
    });
    setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { x: 0.2, y: 0.7 },
      });
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { x: 0.8, y: 0.7 },
      });
    }, 220);
  }

  async function handleChoice(optionIndex) {
    if (!currentQuestion || isLocked) {
      return;
    }

    setIsLocked(true);
    setSelectedOption(optionIndex);

    const isCorrect = optionIndex === currentQuestion.correctOptionIndex;
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);

    setFeedback(isCorrect ? "correct" : "wrong");
    playAudio(isCorrect ? correctAudioRef : wrongAudioRef);

    setTimeout(async () => {
      const isLast = questionIndex >= totalQuestions - 1;

      if (isLast) {
        await updatePlayerRecord(nextCorrectCount);
        setCorrectCount(nextCorrectCount);

        const total = totalQuestions;
        const wrong = total - nextCorrectCount;
        const accuracy = Math.round((nextCorrectCount / total) * 100);
        const isPerfect = nextCorrectCount === total;

        if (isPerfect) {
          playAudio(celebrateAudioRef);
          burstConfetti();
        }

        setEndSummary({
          total,
          correct: nextCorrectCount,
          wrong,
          accuracy,
          isPerfect,
          title: isPerfect
            ? "You made it to the leaderboard!"
            : "Well played! Keep going.",
          subtitle: isPerfect
            ? "Outstanding run. Perfect score achieved."
            : "Great effort. Restart and beat your score.",
        });
        setIsLocked(false);
        return;
      }

      setCorrectCount(nextCorrectCount);
      setQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
      setIsLocked(false);
    }, FEEDBACK_DELAY_MS);
  }

  if (!currentQuestion) {
    return (
      <Box
        sx={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          backgroundImage: "url('/background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Typography sx={{ color: "#fff", fontWeight: 700 }}>
          No questions available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        "@keyframes optionShake": {
          "0%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(7px)" },
          "60%": { transform: "translateX(-6px)" },
          "80%": { transform: "translateX(4px)" },
          "100%": { transform: "translateX(0)" },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box sx={{ width: { xs: 120, sm: 160, md: 190 } }}>
          <Image
            src="/OXY-logo.png"
            alt="OXY logo"
            width={777}
            height={777}
            style={{ width: "100%", height: "auto" }}
            priority
          />
        </Box>

        <Box sx={{ width: { xs: 150, sm: 190, md: 210 } }}>
          <Box
            sx={{
              backgroundColor: "#0f5fbf",
              borderRadius: "4px 4px 0 0",
              px: 1.2,
              py: 0.4,
            }}
          >
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: { xs: "1.2rem", sm: "1.4rem" },
                lineHeight: 1.1,
              }}
            >
              Leaderboard
            </Typography>
          </Box>

          <Box sx={{ backgroundColor: "rgba(255, 255, 255, 0.92)" }}>
            {leaderboardRows.map((name, index) => (
              <Box
                key={`${name}-${index}`}
                sx={{
                  borderBottom:
                    index === leaderboardRows.length - 1
                      ? "none"
                      : "1px solid #0c3b81",
                  py: 0.35,
                  px: 1.2,
                }}
              >
                <Typography
                  sx={{
                    textAlign: "center",
                    color: "#0c3b81",
                    fontWeight: 700,
                    fontSize: { xs: "0.8rem", sm: "0.92rem" },
                  }}
                >
                  {String(name).toUpperCase()}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 860,
            mx: "auto",
            mt: { xs: "10vh", sm: "16vh", md: "22vh" },
            px: { xs: 0.8, sm: 1.6 },
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1.8, sm: 2.4 },
          }}
        >
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.3, sm: 1.8 } }}
          >
            <Typography
              sx={{
                color: "#ff4545",
                fontStyle: "italic",
                fontSize: { xs: "1.65rem", sm: "1.9rem" },
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              Question # {questionIndex + 1}
            </Typography>

            {currentQuestion.helperText && (
              <Typography
                sx={{
                  color: "#8fd8ff",
                  fontWeight: 600,
                  fontSize: { xs: "0.95rem", sm: "1.05rem" },
                  textAlign: "center",
                }}
              >
                {currentQuestion.helperText}
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: { xs: 3.2, sm: 4.4 } }}>
            <Typography
              sx={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: { xs: "1.5rem", sm: "2rem" },
                lineHeight: 1.18,
              }}
            >
              {currentQuestion.questionText}
            </Typography>

            <Box
              sx={{
                height: 2,
                backgroundColor: "rgba(120, 200, 255, 0.6)",
                my: { xs: 0.8, sm: 1.2 },
              }}
            />

            <Box sx={{ mt: { xs: 1.2, sm: 1.8 }, display: "grid", gap: { xs: 1.8, sm: 2.2 } }}>
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectOption = idx === currentQuestion.correctOptionIndex;

                let optionBg = "rgba(242, 247, 250, 0.95)";
                if (feedback === "correct" && isSelected) {
                  optionBg = "#b6f5ca";
                } else if (feedback === "wrong" && isSelected) {
                  optionBg = "#ffb2b2";
                } else if (feedback === "wrong" && isCorrectOption) {
                  optionBg = "#b6f5ca";
                }

                return (
                  <Box
                    key={`${questionIndex}-${idx}`}
                    component="button"
                    onClick={() => handleChoice(idx)}
                    disabled={isLocked}
                    sx={{
                      border: "2px solid #30d3ff",
                      borderRadius: "999px",
                      backgroundColor: optionBg,
                      px: 1.3,
                      py: 0.8,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.3,
                      textAlign: "left",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      transition: "background-color 180ms ease, transform 120ms ease",
                      animation:
                        feedback === "wrong" && isSelected
                          ? "optionShake 360ms ease"
                          : "none",
                      "&:hover": isLocked ? {} : { transform: "translateY(-1px)" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 33,
                        height: 33,
                        borderRadius: "50%",
                        backgroundColor: "#0d5ca9",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </Box>
                    <Typography
                      sx={{
                        color: "#303744",
                        fontWeight: 600,
                        fontSize: { xs: "0.98rem", sm: "1.08rem" },
                        lineHeight: 1.2,
                      }}
                    >
                      {option}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            <Box
              sx={{
                mt: { xs: 2, sm: 2.4 },
                mx: "auto",
                px: 2.8,
                py: 0.95,
                borderRadius: "999px",
                border: "1px solid rgba(122, 217, 255, 0.65)",
                backgroundColor: "rgba(9, 38, 105, 0.62)",
                boxShadow: "0 8px 20px rgba(0, 0, 0, 0.28)",
                width: "fit-content",
              }}
            >
              <Typography
                sx={{
                  textAlign: "center",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: { xs: "1.02rem", sm: "1.2rem" },
                  lineHeight: 1.2,
                }}
              >
                Correct answers: {correctCount}/{totalQuestions}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mt: "auto",
          pt: { xs: 1.2, sm: 1.8 },
          mb: { xs: 0, sm: 0.5 },
          mx: "auto",
          width: { xs: 140, sm: 180 },
        }}
      >
        <Image
          src="/WhiteWallLogo.png"
          alt="WhiteWall logo"
          width={400}
          height={120}
          style={{ width: "100%", height: "auto" }}
          priority
        />
      </Box>

      {endSummary && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(1, 12, 40, 0.68)",
            display: "grid",
            placeItems: "center",
            zIndex: 30,
            px: 2,
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 3,
              border: endSummary.isPerfect
                ? "2px solid #63d9ff"
                : "2px solid #ff8080",
              background:
                endSummary.isPerfect
                  ? "linear-gradient(180deg, rgba(8,43,113,0.96), rgba(7,27,75,0.97))"
                  : "linear-gradient(180deg, rgba(88,28,45,0.96), rgba(60,18,34,0.97))",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
              p: { xs: 2.2, sm: 3 },
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: { xs: "1.4rem", sm: "1.8rem" },
                mb: 0.8,
                textShadow: endSummary.isPerfect
                  ? "0 0 10px rgba(85, 227, 255, 0.35)"
                  : "0 0 10px rgba(255, 120, 120, 0.35)",
              }}
            >
              {endSummary.title}
            </Typography>

            <Typography
              sx={{
                color: endSummary.isPerfect
                  ? "rgba(235, 245, 255, 0.92)"
                  : "rgba(255, 226, 226, 0.95)",
                fontWeight: 500,
                fontSize: { xs: "1rem", sm: "1.15rem" },
                mb: 2,
              }}
            >
              {endSummary.subtitle}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 1,
                mb: 2.2,
              }}
            >
              <Box
                sx={{
                  border: endSummary.isPerfect
                    ? "1px solid rgba(140, 222, 255, 0.5)"
                    : "1px solid rgba(255, 165, 165, 0.55)",
                  borderRadius: 1.2,
                  py: 1,
                  backgroundColor: endSummary.isPerfect
                    ? "rgba(16, 58, 138, 0.28)"
                    : "rgba(128, 31, 50, 0.28)",
                }}
              >
                <Typography
                  sx={{
                    color: endSummary.isPerfect ? "#8fe5ff" : "#ffb7b7",
                    fontSize: "0.86rem",
                  }}
                >
                  Correct
                </Typography>
                <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>
                  {endSummary.correct}
                </Typography>
              </Box>
              <Box
                sx={{
                  border: endSummary.isPerfect
                    ? "1px solid rgba(140, 222, 255, 0.5)"
                    : "1px solid rgba(255, 165, 165, 0.55)",
                  borderRadius: 1.2,
                  py: 1,
                  backgroundColor: endSummary.isPerfect
                    ? "rgba(16, 58, 138, 0.28)"
                    : "rgba(128, 31, 50, 0.28)",
                }}
              >
                <Typography
                  sx={{
                    color: endSummary.isPerfect ? "#8fe5ff" : "#ffb7b7",
                    fontSize: "0.86rem",
                  }}
                >
                  Wrong
                </Typography>
                <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>
                  {endSummary.wrong}
                </Typography>
              </Box>
              <Box
                sx={{
                  border: endSummary.isPerfect
                    ? "1px solid rgba(140, 222, 255, 0.5)"
                    : "1px solid rgba(255, 165, 165, 0.55)",
                  borderRadius: 1.2,
                  py: 1,
                  backgroundColor: endSummary.isPerfect
                    ? "rgba(16, 58, 138, 0.28)"
                    : "rgba(128, 31, 50, 0.28)",
                }}
              >
                <Typography
                  sx={{
                    color: endSummary.isPerfect ? "#8fe5ff" : "#ffb7b7",
                    fontSize: "0.86rem",
                  }}
                >
                  Accuracy
                </Typography>
                <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>
                  {endSummary.accuracy}%
                </Typography>
              </Box>
            </Box>

            <Box
              component="button"
              onClick={() => router.push("/name")}
              sx={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                p: 0,
                width: { xs: 200, sm: 250 },
                lineHeight: 0,
                borderRadius: "14px",
                boxShadow: "0 10px 24px rgba(0, 0, 0, 0.4)",
                transition: "transform 140ms ease, box-shadow 140ms ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 14px 30px rgba(0, 0, 0, 0.45)",
                },
                "&:active": {
                  transform: "translateY(1px)",
                },
              }}
              aria-label="Restart"
            >
              <Image
                src="/Restart With Container.png"
                alt="Restart"
                width={747}
                height={200}
                style={{ width: "100%", height: "auto" }}
                priority
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import questions from "@/data/questions.json";

const FEEDBACK_DELAY_MS = 850;
const TIMER_TOTAL_MS = 120_000;

function shuffleQuestions(list) {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function formatSeconds(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${safe}s`;
}

function getNowMs() {
  return Date.now();
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
  const [wrongCount, setWrongCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [endSummary, setEndSummary] = useState(null);
  const [timeLeftMs, setTimeLeftMs] = useState(TIMER_TOTAL_MS);

  const correctAudioRef = useRef(null);
  const wrongAudioRef = useRef(null);
  const celebrateAudioRef = useRef(null);
  const gameStartedAtRef = useRef(0);
  const isGameFinishedRef = useRef(false);
  const correctCountRef = useRef(0);
  const wrongCountRef = useRef(0);
  const feedbackTimeoutRef = useRef(null);

  const currentQuestion = useMemo(
    () => randomizedQuestions[questionIndex] ?? null,
    [questionIndex, randomizedQuestions]
  );
  const totalQuestions = randomizedQuestions.length;
  const remainingSeconds = Math.ceil(Math.max(0, timeLeftMs) / 1000);

  useEffect(() => {
    gameStartedAtRef.current = getNowMs();
    correctAudioRef.current = new Audio("/correct.wav");
    wrongAudioRef.current = new Audio("/wrong.wav");
    celebrateAudioRef.current = new Audio("/celebrate.mp3");
  }, []);

  useEffect(() => {
    correctCountRef.current = correctCount;
  }, [correctCount]);

  useEffect(() => {
    wrongCountRef.current = wrongCount;
  }, [wrongCount]);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      try {
        const response = await fetch("/api/leaderboard?limit=50");
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

  const updatePlayerRecord = useCallback(
    async (finalCorrectCount, finalWrongCount, timeTakenSeconds) => {
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
            wrongAnswers: finalWrongCount,
            timeTakenSeconds,
            playedAt: new Date().toISOString(),
          }),
        });
      } catch {
        // ignore update failures for now and keep UX moving
      }
    },
    [playerId, totalQuestions]
  );

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

  const finishGame = useCallback(
    async (finalCorrectCount, finalWrongCount, timedOut = false) => {
      const elapsedMs = Math.min(TIMER_TOTAL_MS, getNowMs() - gameStartedAtRef.current);
      const timeTakenSeconds = Math.ceil(elapsedMs / 1000);

      await updatePlayerRecord(finalCorrectCount, finalWrongCount, timeTakenSeconds);
      setCorrectCount(finalCorrectCount);
      setWrongCount(finalWrongCount);

      const total = totalQuestions;
      const wrong = finalWrongCount;
      const attempted = finalCorrectCount + finalWrongCount;
      const accuracy =
        attempted > 0 ? Math.round((finalCorrectCount / attempted) * 100) : 0;
      const isPerfect = finalCorrectCount === total && !timedOut;

      if (isPerfect) {
        playAudio(celebrateAudioRef);
        burstConfetti();
      }

      setEndSummary({
        total,
        correct: finalCorrectCount,
        wrong,
        accuracy,
        isPerfect,
        title: timedOut
          ? "Time's up!"
          : "Score submitted!",
        subtitle: timedOut
          ? "45 seconds are over. Try again for a better rank."
          : "Leaderboard updated with your score and time.",
      });
    },
    [totalQuestions, updatePlayerRecord]
  );

  useEffect(() => {
    if (endSummary) {
      return undefined;
    }

    const tick = () => {
      const elapsedMs = getNowMs() - gameStartedAtRef.current;
      const remainingMs = Math.max(0, TIMER_TOTAL_MS - elapsedMs);
      setTimeLeftMs(remainingMs);

      if (remainingMs <= 0 && !isGameFinishedRef.current) {
        isGameFinishedRef.current = true;
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = null;
        }
        setIsLocked(false);
        setSelectedOption(null);
        setFeedback(null);
        void finishGame(correctCountRef.current, wrongCountRef.current, true);
      }
    };

    tick();
    const intervalId = setInterval(tick, 100);
    return () => clearInterval(intervalId);
  }, [endSummary, finishGame]);

  async function handleChoice(optionIndex) {
    if (!currentQuestion || isLocked || isGameFinishedRef.current || timeLeftMs <= 0) {
      return;
    }

    setIsLocked(true);
    setSelectedOption(optionIndex);

    const isCorrect = optionIndex === currentQuestion.correctOptionIndex;
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextWrongCount = wrongCount + (isCorrect ? 0 : 1);

    setFeedback(isCorrect ? "correct" : "wrong");
    playAudio(isCorrect ? correctAudioRef : wrongAudioRef);

    feedbackTimeoutRef.current = setTimeout(async () => {
      feedbackTimeoutRef.current = null;
      if (isGameFinishedRef.current) {
        return;
      }

      const isLast = questionIndex >= totalQuestions - 1;

      if (isLast) {
        isGameFinishedRef.current = true;
        await finishGame(nextCorrectCount, nextWrongCount);
        setIsLocked(false);
        return;
      }

      setCorrectCount(nextCorrectCount);
      setWrongCount(nextWrongCount);
      setQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
      setIsLocked(false);
    }, FEEDBACK_DELAY_MS);
  }

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    },
    []
  );

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
        height: "100vh",
        minHeight: "100vh",
        maxHeight: "100vh",
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
        "@keyframes timerPulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "@keyframes timerUrgentGlow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 80, 80, 0.45)" },
          "50%": { boxShadow: "0 0 0 10px rgba(255, 80, 80, 0)" },
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: { xs: 8, sm: 10 },
            left: 0,
            width: "100vw",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 40,
          }}
        >
          <Box
            sx={{
              px: { xs: 1.4, sm: 2.4 },
              py: { xs: 0.5, sm: 0.7 },
              borderRadius: "999px",
              border: timeLeftMs <= 10_000 ? "1px solid #ff7c7c" : "1px solid #6ed4ff",
              background:
                timeLeftMs <= 10_000
                  ? "linear-gradient(180deg, rgba(88, 24, 37, 0.92), rgba(62, 16, 26, 0.95))"
                  : "linear-gradient(180deg, rgba(14, 74, 146, 0.9), rgba(8, 43, 108, 0.95))",
              animation:
                timeLeftMs <= 10_000
                  ? "timerPulse 0.7s ease-in-out infinite, timerUrgentGlow 1.2s ease-in-out infinite"
                  : "timerPulse 1.4s ease-in-out infinite",
              display: "flex",
              alignItems: "flex-end",
              gap: 0.6,
              lineHeight: 1,
            }}
          >
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 900,
                fontSize: "clamp(2.2rem, 8vw, 4.4rem)",
                letterSpacing: "-0.02em",
                lineHeight: 0.9,
                textShadow: "0 5px 16px rgba(0, 0, 0, 0.45)",
              }}
            >
              {remainingSeconds}
            </Typography>
            <Typography
              sx={{
                color: "rgba(235, 245, 255, 0.95)",
                fontWeight: 800,
                fontSize: "clamp(0.85rem, 2.8vw, 1.15rem)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                mb: 0.35,
              }}
            >
              sec
            </Typography>
          </Box>
        </Box>

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

        <Box sx={{ width: { xs: 180, sm: 230, md: 260 } }}>
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

          <Box
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              height: 285,
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorY: "contain",
              scrollbarWidth: "thin",
            }}
          >
            {leaders.map((entry, index) => (
              <Box
                key={`${entry.id}-${index}`}
                sx={{
                  borderBottom: index === leaders.length - 1 ? "none" : "1px solid #0c3b81",
                  py: 0.35,
                  px: 1.2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    textAlign: "left",
                    color: "#0c3b81",
                    fontWeight: 700,
                    fontSize: { xs: "0.8rem", sm: "0.92rem" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {String(entry.name || "").toUpperCase()}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexShrink: 0 }}>
                  <Typography
                    sx={{
                      color: "#0f5fbf",
                      fontWeight: 800,
                      fontSize: { xs: "0.72rem", sm: "0.8rem" },
                      px: 0.7,
                      py: 0.2,
                      borderRadius: "999px",
                      backgroundColor: "rgba(15, 95, 191, 0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.correctAnswers}/{entry.totalQuestions}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#aa2a44",
                      fontWeight: 800,
                      fontSize: { xs: "0.72rem", sm: "0.8rem" },
                      px: 0.7,
                      py: 0.2,
                      borderRadius: "999px",
                      backgroundColor: "rgba(170, 42, 68, 0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatSeconds(entry.timeTakenSeconds)}
                  </Typography>
                </Box>
              </Box>
            ))}
            {leaders.length === 0 && (
              <Box sx={{ py: 1.2, px: 1 }}>
                <Typography
                  sx={{
                    textAlign: "center",
                    color: "#0c3b81",
                    fontWeight: 700,
                    fontSize: { xs: "0.8rem", sm: "0.92rem" },
                  }}
                >
                  No players yet
                </Typography>
              </Box>
            )}
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

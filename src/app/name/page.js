"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useInfiniteLeaderboard from "@/hooks/useInfiniteLeaderboard";

export default function NamePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const {
    leaders,
    isLeadersLoading,
    hasMoreLeaders,
    leaderboardContainerRef,
    handleLeaderboardScroll,
  } = useInfiniteLeaderboard();

  function formatSeconds(seconds) {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
    return `${safe}s`;
  }

  const handleStartGame = async () => {
    const trimmedName = name.trim();
    let nextUrl = "/questions";

    if (!trimmedName || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          totalQuestions: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.id) {
          nextUrl = `/questions?playerId=${data.id}`;
        }
      }
    } finally {
      setIsSaving(false);
    }

    router.push(nextUrl);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        minHeight: "100vh",
        maxHeight: "100vh",
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
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
            ref={leaderboardContainerRef}
            onScroll={handleLeaderboardScroll}
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
                  borderBottom:
                    index === leaders.length - 1
                      ? "none"
                      : "1px solid #0c3b81",
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
            {leaders.length === 0 && !isLeadersLoading && (
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
            {isLeadersLoading && (
              <Box sx={{ py: 0.9, px: 1 }}>
                <Typography
                  sx={{
                    textAlign: "center",
                    color: "#0f5fbf",
                    fontWeight: 700,
                    fontSize: { xs: "0.76rem", sm: "0.86rem" },
                  }}
                >
                  Loading more...
                </Typography>
              </Box>
            )}
            {!hasMoreLeaders && leaders.length > 0 && (
              <Box sx={{ py: 0.8, px: 1 }}>
                <Typography
                  sx={{
                    textAlign: "center",
                    color: "#3a5b89",
                    fontWeight: 600,
                    fontSize: { xs: "0.72rem", sm: "0.8rem" },
                  }}
                >
                  End of leaderboard
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          position: "relative",
          width: "100vw",
          aspectRatio: "9 / 13",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mt: { xs: 2, sm: 3 },
          minHeight: 0,
        }}
      >
        <Box
          component="img"
          src="/empty-container.png"
          alt="Form container"
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "-4%",
            width: "108%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            zIndex: 1,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            zIndex: 2,
            width: { xs: "72%", sm: "64%", md: "58%" },
            maxWidth: 520,
            top: "52%",
            left: "48%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2.5, sm: 3 },
          }}
        >
          <Typography
            sx={{
              color: "#ffffff",
              textAlign: "center",
              fontWeight: 700,
              fontSize: { xs: "1.8rem", sm: "2.2rem" },
              lineHeight: 1.15,
            }}
          >
            Welcome to Growth Navigator Game
          </Typography>

          <Box>
            <Typography
              sx={{
                color: "#ffffff",
                fontWeight: 700,
                mb: 1,
                fontSize: { xs: "1.4rem", sm: "1.8rem" },
              }}
            >
              Name:
            </Typography>
            <Box
              component="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              sx={{
                width: "100%",
                border: "2px solid #40d7ff",
                borderRadius: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                px: 1.6,
                py: 1.2,
                fontSize: { xs: "1.1rem", sm: "1.2rem" },
                outline: "none",
              }}
            />
          </Box>

          <Box
            component="button"
            onClick={handleStartGame}
            disabled={!name.trim() || isSaving}
            sx={{
              mt: { xs: 1.2, sm: 1.6 },
              background: "transparent",
              border: 0,
              p: 0,
              cursor: !name.trim() || isSaving ? "not-allowed" : "pointer",
              opacity: !name.trim() || isSaving ? 0.75 : 1,
              width: "100%",
              lineHeight: 0,
              borderRadius: "14px",
              transform: "translateY(0)",
              boxShadow: !name.trim() || isSaving
                ? "0 6px 14px rgba(0, 0, 0, 0.3)"
                : "0 10px 26px rgba(0, 0, 0, 0.45)",
              transition:
                "transform 140ms ease, box-shadow 140ms ease, filter 140ms ease",
              filter: "drop-shadow(0 2px 2px rgba(255, 255, 255, 0.15))",
              "&:hover": !name.trim() || isSaving
                ? {}
                : {
                    transform: "translateY(-2px)",
                    boxShadow: "0 14px 30px rgba(0, 0, 0, 0.5)",
                  },
              "&:active": !name.trim() || isSaving
                ? {}
                : {
                    transform: "translateY(1px)",
                    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.45)",
                  },
            }}
            aria-label="Game Start"
          >
            <Image
              src="/game-start.png"
              alt="Game Start"
              width={747}
              height={200}
              style={{ width: "100%", height: "auto" }}
              priority
            />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mt: "auto",
          pt: { xs: 1.5, sm: 2 },
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
    </Box>
  );
}


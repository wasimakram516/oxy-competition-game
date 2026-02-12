"use client";

import { Box } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleGetStarted = async () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("winners");

    try {
      await fetch("/api/players/reset", { method: "POST" });
    } catch {
      // ignore reset errors and continue navigation
    }

    router.push("/name");
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        px: "clamp(8px, 2vw, 16px)",
        py: "clamp(12px, 3vh, 32px)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: "clamp(170px, 28vw, 290px)",
          height: "clamp(170px, 28vw, 290px)",
          mt: "clamp(2px, 1vh, 8px)",
          position: "relative",
          zIndex: 3,
          flexShrink: 0,
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src="/OXY-logo.png"
          alt="OXY logo"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      </Box>

      <Box
        sx={{
          position: "relative",
          width: "100vw",
          aspectRatio: "9 / 13",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mt: { xs: 1, sm: 1.5 },
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          component="img"
          src="/container-with-icons.png"
          alt="Container with icons"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            zIndex: 1,
            display: "block",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: "clamp(190px, 52vw, 340px)",
            zIndex: 3,
            top: "clamp(41%, 43vh, 44%)",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Image
            src="/quiz-game.png"
            alt="Quiz game"
            width={230}
            height={230}
            style={{ width: "100%", height: "auto" }}
            priority
          />
        </Box>

        <Box
          component="button"
          onClick={handleGetStarted}
          sx={{
            position: "absolute",
            zIndex: 4,
            top: "70%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "transparent",
            border: 0,
            cursor: "pointer",
            p: 0,
            width: "clamp(180px, 56vw, 500px)",
            lineHeight: 0,
            borderRadius: "14px",
            boxShadow: "0 10px 26px rgba(0, 0, 0, 0.45)",
            transition: "transform 140ms ease, box-shadow 140ms ease, filter 140ms ease",
            filter: "drop-shadow(0 2px 2px rgba(255, 255, 255, 0.15))",
            "&:hover": {
              transform: "translate(-50%, calc(-50% - 2px))",
              boxShadow: "0 14px 30px rgba(0, 0, 0, 0.5)",
            },
            "&:active": {
              transform: "translate(-50%, calc(-50% + 1px))",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.45)",
            },
          }}
          aria-label="Start Game"
        >
          <Image
            src="/Get Started With Container.png"
            alt="Get Started"
            width={747}
            height={200}
            style={{ width: "100%", height: "auto" }}
            priority
          />
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          maxWidth: "clamp(120px, 24vw, 180px)",
          mt: "clamp(8px, 2vh, 16px)",
          mb: "clamp(2px, 1vh, 8px)",
          opacity: 0.95,
          flexShrink: 0,
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


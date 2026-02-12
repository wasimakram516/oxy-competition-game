# OXY Competition Game

Next.js 16 quiz game with:
- custom image-driven UI
- MongoDB-backed player stats
- leaderboard API
- sounds + animations for answer feedback

## Tech Stack

- Next.js (App Router)
- React
- MUI
- MongoDB + Mongoose

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add environment variables:

Create `.env.local` and set:

```env
MONGODB_URI=your_mongodb_connection_string
```

3. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Main Pages

- `/`  
  Landing page with OXY branding and Get Started button.
- `/name`  
  Name entry screen with leaderboard preview.
- `/questions`  
  Quiz screen with randomized questions, correct/wrong feedback, sounds, and end summary popup.

## Quiz Behavior

- Questions are loaded from `src/data/questions.json`.
- Questions are shuffled each session.
- Selecting an option:
  - correct: green feedback + correct sound
  - wrong: red feedback + shake + wrong sound
- End of game:
  - always shows summary popup with stats
  - perfect score triggers celebrate sound + confetti
  - restart button returns user to `/name`

## Backend/API

- `POST /api/players`  
  Create a player record.
- `PATCH /api/players/:id`  
  Update player stats after quiz.
- `GET /api/leaderboard?limit=6&onlyPerfect=true`  
  Get sorted leaderboard entries.
- `POST /api/players/reset`  
  Reset all players' quiz stats (called from landing page Get Started).

## Data Model

`Player` model fields:
- `name`
- `totalQuestions`
- `correctAnswers`
- `wrongAnswers`
- `playedAt`

Model file: `src/models/player.js`

## Key Files

- `src/app/page.js` - landing
- `src/app/name/page.js` - name + leaderboard UI
- `src/app/questions/page.js` - quiz flow
- `src/data/questions.json` - question dataset
- `src/lib/mongodb.js` - Mongo connection helper
- `src/app/api/**` - API routes

## Scripts

- `npm run dev` - start local server
- `npm run lint` - run ESLint
- `npm run build` - production build

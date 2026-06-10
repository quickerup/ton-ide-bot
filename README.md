# ton-ide-bot

A modular, service-oriented Telegram bot for TON contract compilation, deployment, and wallet interaction.

## Features

- Telegram bot interface using `telegraf`
- Session persistence with Redis
- Modular services for compiler, deployer, TON Connect, and TON client access
- Temporary file management for code uploads and compilation
- State-driven controller design for chat-based workflows

## Setup

1. Copy `.env.example` to `.env` and fill in your values.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Project structure

- `src/app.ts` — application entry point
- `src/bot/` — Telegram interface layer
- `src/services/` — business logic and blockchain helpers
- `src/storage/` — session persistence and Redis connection
- `src/utils/` — helpers for file management and logging
- `public/tonconnect-manifest.json` — TON Connect metadata entrypoint

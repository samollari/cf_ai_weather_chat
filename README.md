# Cloudflare Software Engineering Internship Application Assignment

## About

This is a chat bot that can request forecast information from the National Weather Service and answer the user's natural language queries based on that data.

It uses Llama 3.3 on Workers AI with tool calling and the Cloudflare Agents framework. It can remember context throughout a conversation and answer follow-up questions without requiring the user to respecify the location each time.

## Structure

It is based on the [Cloudflare Agents starter project](https://github.com/cloudflare/agents-starter), with changes predominantly in the following files:

- `tools.ts` - Tool building for weather information querying. Uses prompt chaining to extrapolate information from the user's specified location and to intelligently select the ideal forecast area.
- `server.ts` - System prompt tweaks
- `app.tsx` - UI copy changes

## Running

Project is deployed at [https://cf-ai-weather-chat.gizm0.workers.dev/](https://cf-ai-weather-chat.gizm0.workers.dev/), but you may also deploy manually with `npm run deploy`

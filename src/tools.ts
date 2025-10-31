/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod/v3";

const USER_AGENT =
  "AI Weather Chat; sam@gizm0.dev (project for job application)";
const API_REQUEST_CONFIG = {
  headers: {
    Accept: "application/ld+json",
    "User-Agent": USER_AGENT
  }
};
const zoneResponse = z.object({
  "@graph": z.array(
    z.object({
      id: z.string(),
      name: z.string()
    })
  )
});

const getZonesInState = tool({
  description:
    "get all forecast zones in a specified US state. zone names typically correspond to counties or metropolitan areas",
  inputSchema: z.object({ state: z.array(z.string().length(2).toUpperCase()) }),
  execute: async ({ state }) => {
    const url = new URL("https://api.weather.gov/zones");
    url.searchParams.set("area", state.join(","));
    url.searchParams.set("type", "forecast");
    url.searchParams.set("include_geometry", "false");

    const response = await fetch(url, API_REQUEST_CONFIG);
    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const responseData = await response.json();
    return zoneResponse.parse(responseData);
  }
});

const forecastResponse = z.object({
  updated: z.string(),
  periods: z.array(
    z.object({
      number: z.number().int(),
      name: z.string(),
      detailedForecast: z.string()
    })
  )
});
const getZoneForecast = tool({
  description: "get a text forecast for the next week for the provided zone",
  inputSchema: z.object({ zone: z.string() }),
  execute: async ({ zone }) => {
    const url = new URL(
      `https://api.weather.gov/zones/forecast/${encodeURIComponent(zone)}/forecast`
    );
    const response = await fetch(url, API_REQUEST_CONFIG);
    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const responseData = await response.json();
    return forecastResponse.parse(responseData);
  }
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  getZonesInState,
  getZoneForecast
} satisfies ToolSet;

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
  // getWeatherInformation: async ({ city }: { city: string }) => {
  //   console.log(`Getting weather information for ${city}`);
  //   return `The weather in ${city} is sunny`;
  // }
};

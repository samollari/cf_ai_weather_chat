/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { generateText, tool, type ToolSet } from "ai";
import { z } from "zod/v3";
import { model } from "./server";

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

const getZonesInStates = async ({ states }: { states: string[] }) => {
  const url = new URL("https://api.weather.gov/zones");
  url.searchParams.set("area", states.join(","));
  url.searchParams.set("type", "forecast");
  url.searchParams.set("include_geometry", "false");

  const response = await fetch(url, API_REQUEST_CONFIG);
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const responseData = await response.json();
  return zoneResponse.parse(responseData)["@graph"];
};

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
const getZoneForecast = async ({ zone }: { zone: string }) => {
  const url = new URL(
    `https://api.weather.gov/zones/forecast/${encodeURIComponent(zone)}/forecast`
  );
  const response = await fetch(url, API_REQUEST_CONFIG);
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const responseData = await response.json();
  return forecastResponse.parse(responseData);
};

const firstRoundMatcher = /(?:[A-Z]{2}, ?)*[A-Z]{2}?/;
const secondRoundMatcher = /(?:\w{2}, ?)+\w{2}?/i;
const getForecast = tool({
  description:
    "get a text-based forecast for a given location. Only supports locations in the United States. If the query is ambiguous, this tool may request clarification. In that case, do not immediately call it again, ask the user to clarify the location and try again with more information",
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log({ location });

    const stateCodePrompt = `You are an AI assistant that assists with narrowing down general locations described by a user.
Below you will be given some user-provided text describing a location for a weather forecast and are tasked with identifying U.S. state (or multiple nearest states) that location is most likely in.
If the location is not in the U.S. (for example, "London"), respond only with the text "Not in the U.S."
If the location is actually in the U.S. (for example, "Kansas City" or "southern Florida"), return a comma-separated list of capitalized two-letter state abbreviations with no spaces, such as "MO,KS" or "FL".
If you believe the query needs clarification (for example, there are many cities named "Springfield"), respond with the text "Clarify" to request clarification on the location.
Do not include quotation marks like in the above examples, return the text plain. Do not include any extra text in your response besides what is asked of you above.

User location query: "${location}"`;
    console.log({ stateCodePrompt });
    const stateCodeResponse = await generateText({
      model,
      prompt: stateCodePrompt
    });
    console.log({ text: stateCodeResponse.text }, stateCodeResponse);

    if (stateCodeResponse.text.toLowerCase().startsWith("clarify")) {
      return "Too many location options available. Please clarify location with user.";
    }

    const firstRoundMatch = firstRoundMatcher.exec(stateCodeResponse.text);
    const matches = new Set(
      firstRoundMatch
        ? firstRoundMatch[0]
            .toUpperCase()
            .split(",")
            .map((v) => v.trim())
        : []
    );
    const secondRoundMatch = secondRoundMatcher.exec(stateCodeResponse.text);
    (secondRoundMatch
      ? secondRoundMatch[0]
          .toUpperCase()
          .split(",")
          .map((v) => v.trim())
      : []
    ).forEach((state) => matches.add(state));

    if (matches.size == 0) {
      return "No state found for location. Couldn't fetch weather.";
    }

    const zones = await getZonesInStates({ states: [...matches] });

    const zonePickPrompt = `You are an AI assistant that assists with narrowing down general locations described by a user.
Below you will be given some user-provided text describing a location for a weather forecast as well as some identified forecast zones that are likely candidates. You are tasked with selecting the zone ID the user is most likely requesting a forecast for.

The user requested a forecast for "${location}".
The zones identified as likely candidates are listed below in the following format: "ZONEID: Name". Respond with only the zone ID of the most likely requested zone exactly as provided.
${zones.map(({ id, name }) => `${id}: ${name}`).join("\n")}
`;
    console.log({ zonePickPrompt });
    const zonePickResponse = await generateText({
      model,
      prompt: zonePickPrompt
    });
    console.log({ text: zonePickResponse.text }, zonePickResponse);

    const selectionMatcher = new RegExp(zones.map(({ id }) => id).join("|"));
    console.log(selectionMatcher);
    const selectedZoneMatch = selectionMatcher.exec(zonePickResponse.text);

    if (selectedZoneMatch === null) {
      throw new Error("No zone selected. Couldn't fetch weather");
    }

    const forecast = await getZoneForecast({ zone: selectedZoneMatch[0] });
    console.log({ forecast });
    return forecast;
  }
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  getForecast
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


import { GoogleGenAI, Type } from "@google/genai";
import { TripPreferences, ItineraryResponse } from "../types";

export async function generateTripItinerary(prefs: TripPreferences): Promise<ItineraryResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const paceLabel = prefs.pace === 1 ? 'Slow & Relaxed' : prefs.pace === 2 ? 'Moderate' : 'Fast-paced & Packed';
  
  const groupDetail = prefs.travellerType === 'group' 
    ? `Group Size Range: ${prefs.groupSize}` 
    : prefs.travellerType;

  const prompt = `
    Generate a highly detailed and personalized travel itinerary.
    User Details:
    - Name: ${prefs.fullName}
    - Origin: ${prefs.origin}
    - Destination: ${prefs.destination}
    - Trip Duration: ${prefs.startDate} to ${prefs.endDate}
    - Travel Mode: ${prefs.travelMode}
    - Total Budget Range: ${prefs.budget}
    - Traveler Type: ${groupDetail}
    - Interests: ${prefs.interests.join(', ')}
    - Preferred Pace: ${paceLabel}

    Please provide:
    1. A logical flow optimized for a ${groupDetail} trip.
    2. Estimated costs for activities per person where possible.
    3. Creative suggestions that fit the chosen budget level.
    4. Ensure transport and dining suggestions are practical for the group size (e.g., if 10+, suggest venues with large capacity).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: "You are an elite global travel consultant. You specialize in creating logical, exciting, and budget-conscious itineraries. Always account for the traveler type and group size in your suggestions.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tripTitle: { type: Type.STRING, description: "A catchy title for the trip" },
          destination: { type: Type.STRING },
          totalEstimatedCost: { type: Type.STRING, description: "Total estimated trip cost for the whole party" },
          itinerary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                title: { type: Type.STRING },
                activities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      activity: { type: Type.STRING },
                      location: { type: Type.STRING },
                      description: { type: Type.STRING },
                      estimatedCost: { type: Type.STRING }
                    },
                    required: ["time", "activity", "location", "description"]
                  }
                }
              },
              required: ["day", "title", "activities"]
            }
          },
          travelTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["tripTitle", "destination", "totalEstimatedCost", "itinerary", "travelTips"]
      }
    },
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data as ItineraryResponse;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("The AI provided an invalid itinerary format. Please try again.");
  }
}

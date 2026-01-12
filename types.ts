
export type TravelMode = 'Flight' | 'Bus' | 'Train';
export type TravellerType = 'solo' | 'couple' | 'group';

export interface TripPreferences {
  fullName: string;
  email: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelMode: TravelMode;
  returnTransport: boolean;
  budget: string;
  travellerType: TravellerType;
  groupSize?: string; // New field for group size range: '3-10' or '10+'
  interests: string[];
  pace: number;
}

export interface ItineraryActivity {
  time: string;
  activity: string;
  location: string;
  description: string;
  estimatedCost?: string;
}

export interface DayPlan {
  day: number;
  title: string;
  activities: ItineraryActivity[];
}

export interface ItineraryResponse {
  tripTitle: string;
  destination: string;
  totalEstimatedCost: string;
  itinerary: DayPlan[];
  travelTips: string[];
}

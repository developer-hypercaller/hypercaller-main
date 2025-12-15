/**
 * Indian cities database
 * List of major Indian cities with states and coordinates
 * Includes state capitals, major metropolitan cities, popular tourist destinations, and major business hubs
 */

export interface IndianCity {
  city: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

/**
 * Major Indian cities database
 * Structure: { city: string, state: string, coordinates: { lat, lng } }
 */
export const indianCities: IndianCity[] = [
  // State Capitals - Tier 1 & Major Cities
  { city: "Mumbai", state: "Maharashtra", coordinates: { lat: 19.0760, lng: 72.8777 } },
  { city: "Delhi", state: "Delhi", coordinates: { lat: 28.6139, lng: 77.2090 } },
  { city: "Bengaluru", state: "Karnataka", coordinates: { lat: 12.9716, lng: 77.5946 } },
  { city: "Hyderabad", state: "Telangana", coordinates: { lat: 17.3850, lng: 78.4867 } },
  { city: "Chennai", state: "Tamil Nadu", coordinates: { lat: 13.0827, lng: 80.2707 } },
  { city: "Kolkata", state: "West Bengal", coordinates: { lat: 22.5726, lng: 88.3639 } },
  { city: "Pune", state: "Maharashtra", coordinates: { lat: 18.5204, lng: 73.8567 } },
  { city: "Ahmedabad", state: "Gujarat", coordinates: { lat: 23.0225, lng: 72.5714 } },
  { city: "Jaipur", state: "Rajasthan", coordinates: { lat: 26.9124, lng: 75.7873 } },
  { city: "Surat", state: "Gujarat", coordinates: { lat: 21.1702, lng: 72.8311 } },

  // State Capitals - Tier 2 & Other Capitals
  { city: "Lucknow", state: "Uttar Pradesh", coordinates: { lat: 26.8467, lng: 80.9462 } },
  { city: "Bhopal", state: "Madhya Pradesh", coordinates: { lat: 23.2599, lng: 77.4126 } },
  { city: "Patna", state: "Bihar", coordinates: { lat: 25.5941, lng: 85.1376 } },
  { city: "Bhubaneswar", state: "Odisha", coordinates: { lat: 20.2961, lng: 85.8245 } },
  { city: "Chandigarh", state: "Chandigarh", coordinates: { lat: 30.7333, lng: 76.7794 } },
  { city: "Dehradun", state: "Uttarakhand", coordinates: { lat: 30.3165, lng: 78.0322 } },
  { city: "Gandhinagar", state: "Gujarat", coordinates: { lat: 23.2156, lng: 72.6369 } },
  { city: "Panaji", state: "Goa", coordinates: { lat: 15.4909, lng: 73.8278 } },
  { city: "Shimla", state: "Himachal Pradesh", coordinates: { lat: 31.1048, lng: 77.1734 } },
  { city: "Srinagar", state: "Jammu and Kashmir", coordinates: { lat: 34.0837, lng: 74.7973 } },
  { city: "Raipur", state: "Chhattisgarh", coordinates: { lat: 21.2514, lng: 81.6296 } },
  { city: "Ranchi", state: "Jharkhand", coordinates: { lat: 23.3441, lng: 85.3096 } },
  { city: "Gangtok", state: "Sikkim", coordinates: { lat: 27.3389, lng: 88.6065 } },
  { city: "Agartala", state: "Tripura", coordinates: { lat: 23.8315, lng: 91.2868 } },
  { city: "Aizawl", state: "Mizoram", coordinates: { lat: 23.7271, lng: 92.7176 } },
  { city: "Imphal", state: "Manipur", coordinates: { lat: 24.8170, lng: 93.9368 } },
  { city: "Kohima", state: "Nagaland", coordinates: { lat: 25.6751, lng: 94.1086 } },
  { city: "Shillong", state: "Meghalaya", coordinates: { lat: 25.5788, lng: 91.8933 } },
  { city: "Dispur", state: "Assam", coordinates: { lat: 26.1433, lng: 91.7898 } },
  { city: "Itanagar", state: "Arunachal Pradesh", coordinates: { lat: 27.0844, lng: 93.6053 } },
  { city: "Thiruvananthapuram", state: "Kerala", coordinates: { lat: 8.5241, lng: 76.9366 } },
  { city: "Amaravati", state: "Andhra Pradesh", coordinates: { lat: 16.5062, lng: 80.6480 } },
  { city: "Port Blair", state: "Andaman and Nicobar Islands", coordinates: { lat: 11.6234, lng: 92.7265 } },
  { city: "Kavaratti", state: "Lakshadweep", coordinates: { lat: 10.5626, lng: 72.6369 } },
  { city: "Daman", state: "Daman and Diu", coordinates: { lat: 20.4283, lng: 72.8397 } },
  { city: "Silvassa", state: "Dadra and Nagar Haveli", coordinates: { lat: 20.2734, lng: 73.0193 } },
  { city: "Puducherry", state: "Puducherry", coordinates: { lat: 11.9416, lng: 79.8083 } },

  // Major Metropolitan Cities & Business Hubs
  { city: "Gurugram", state: "Haryana", coordinates: { lat: 28.4089, lng: 77.0378 } },
  { city: "Noida", state: "Uttar Pradesh", coordinates: { lat: 28.5355, lng: 77.3910 } },
  { city: "Faridabad", state: "Haryana", coordinates: { lat: 28.4089, lng: 77.3178 } },
  { city: "Ghaziabad", state: "Uttar Pradesh", coordinates: { lat: 28.6692, lng: 77.4538 } },
  { city: "Nagpur", state: "Maharashtra", coordinates: { lat: 21.1458, lng: 79.0882 } },
  { city: "Indore", state: "Madhya Pradesh", coordinates: { lat: 22.7196, lng: 75.8577 } },
  { city: "Vadodara", state: "Gujarat", coordinates: { lat: 22.3072, lng: 73.1812 } },
  { city: "Visakhapatnam", state: "Andhra Pradesh", coordinates: { lat: 17.6868, lng: 83.2185 } },
  { city: "Coimbatore", state: "Tamil Nadu", coordinates: { lat: 11.0168, lng: 76.9558 } },
  { city: "Madurai", state: "Tamil Nadu", coordinates: { lat: 9.9252, lng: 78.1198 } },
  { city: "Kochi", state: "Kerala", coordinates: { lat: 9.9312, lng: 76.2673 } },
  { city: "Kozhikode", state: "Kerala", coordinates: { lat: 11.2588, lng: 75.7804 } },
  { city: "Thrissur", state: "Kerala", coordinates: { lat: 10.5276, lng: 76.2144 } },
  { city: "Kanpur", state: "Uttar Pradesh", coordinates: { lat: 26.4499, lng: 80.3319 } },
  { city: "Allahabad", state: "Uttar Pradesh", coordinates: { lat: 25.4358, lng: 81.8463 } },
  { city: "Varanasi", state: "Uttar Pradesh", coordinates: { lat: 25.3176, lng: 82.9739 } },
  { city: "Agra", state: "Uttar Pradesh", coordinates: { lat: 27.1767, lng: 78.0081 } },
  { city: "Meerut", state: "Uttar Pradesh", coordinates: { lat: 28.9845, lng: 77.7064 } },
  { city: "Ludhiana", state: "Punjab", coordinates: { lat: 30.9010, lng: 75.8573 } },
  { city: "Amritsar", state: "Punjab", coordinates: { lat: 31.6340, lng: 74.8723 } },
  { city: "Jalandhar", state: "Punjab", coordinates: { lat: 31.3260, lng: 75.5762 } },
  { city: "Nashik", state: "Maharashtra", coordinates: { lat: 19.9975, lng: 73.7898 } },
  { city: "Aurangabad", state: "Maharashtra", coordinates: { lat: 19.8762, lng: 75.3433 } },
  { city: "Solapur", state: "Maharashtra", coordinates: { lat: 17.6599, lng: 75.9064 } },
  { city: "Rajkot", state: "Gujarat", coordinates: { lat: 22.3039, lng: 70.8022 } },
  { city: "Bhavnagar", state: "Gujarat", coordinates: { lat: 21.7645, lng: 72.1519 } },
  { city: "Jamshedpur", state: "Jharkhand", coordinates: { lat: 22.8046, lng: 86.2029 } },
  { city: "Bareilly", state: "Uttar Pradesh", coordinates: { lat: 28.3670, lng: 79.4304 } },
  { city: "Aligarh", state: "Uttar Pradesh", coordinates: { lat: 27.8974, lng: 78.0880 } },
  { city: "Mysuru", state: "Karnataka", coordinates: { lat: 12.2958, lng: 76.6394 } },
  { city: "Mangalore", state: "Karnataka", coordinates: { lat: 12.9141, lng: 74.8560 } },
  { city: "Hubli", state: "Karnataka", coordinates: { lat: 15.3647, lng: 75.1240 } },
  { city: "Tiruchirappalli", state: "Tamil Nadu", coordinates: { lat: 10.7905, lng: 78.7047 } },
  { city: "Salem", state: "Tamil Nadu", coordinates: { lat: 11.6643, lng: 78.1460 } },
  { city: "Tirunelveli", state: "Tamil Nadu", coordinates: { lat: 8.7139, lng: 77.7567 } },
  { city: "Warangal", state: "Telangana", coordinates: { lat: 18.0000, lng: 79.5881 } },
  { city: "Nizamabad", state: "Telangana", coordinates: { lat: 18.6715, lng: 78.0988 } },
  { city: "Cuttack", state: "Odisha", coordinates: { lat: 20.4625, lng: 85.8829 } },
  { city: "Rourkela", state: "Odisha", coordinates: { lat: 22.2604, lng: 84.8536 } },
  { city: "Bhilai", state: "Chhattisgarh", coordinates: { lat: 21.2092, lng: 81.4285 } },
  { city: "Durg", state: "Chhattisgarh", coordinates: { lat: 21.1900, lng: 81.2800 } },
  { city: "Gwalior", state: "Madhya Pradesh", coordinates: { lat: 26.2183, lng: 78.1828 } },
  { city: "Jabalpur", state: "Madhya Pradesh", coordinates: { lat: 23.1815, lng: 79.9864 } },
  { city: "Ujjain", state: "Madhya Pradesh", coordinates: { lat: 23.1765, lng: 75.7885 } },
  { city: "Guwahati", state: "Assam", coordinates: { lat: 26.1445, lng: 91.7362 } },
  { city: "Silchar", state: "Assam", coordinates: { lat: 24.8333, lng: 92.7789 } },
  { city: "Dibrugarh", state: "Assam", coordinates: { lat: 27.4728, lng: 94.9120 } },
  { city: "Jorhat", state: "Assam", coordinates: { lat: 26.7509, lng: 94.2037 } },

  // Popular Tourist Destinations
  { city: "Udaipur", state: "Rajasthan", coordinates: { lat: 24.5854, lng: 73.7125 } },
  { city: "Jodhpur", state: "Rajasthan", coordinates: { lat: 26.2389, lng: 73.0243 } },
  { city: "Pushkar", state: "Rajasthan", coordinates: { lat: 26.4902, lng: 74.5509 } },
  { city: "Mount Abu", state: "Rajasthan", coordinates: { lat: 24.5925, lng: 72.7156 } },
  { city: "Rishikesh", state: "Uttarakhand", coordinates: { lat: 30.0869, lng: 78.2676 } },
  { city: "Haridwar", state: "Uttarakhand", coordinates: { lat: 29.9457, lng: 78.1642 } },
  { city: "Mussoorie", state: "Uttarakhand", coordinates: { lat: 30.4546, lng: 78.0700 } },
  { city: "Nainital", state: "Uttarakhand", coordinates: { lat: 29.3919, lng: 79.4542 } },
  { city: "Manali", state: "Himachal Pradesh", coordinates: { lat: 32.2432, lng: 77.1892 } },
  { city: "Dharamshala", state: "Himachal Pradesh", coordinates: { lat: 32.2190, lng: 76.3234 } },
  { city: "McLeod Ganj", state: "Himachal Pradesh", coordinates: { lat: 32.2432, lng: 76.3234 } },
  { city: "Ooty", state: "Tamil Nadu", coordinates: { lat: 11.4102, lng: 76.6950 } },
  { city: "Kodaikanal", state: "Tamil Nadu", coordinates: { lat: 10.2381, lng: 77.4892 } },
  { city: "Mahabalipuram", state: "Tamil Nadu", coordinates: { lat: 12.6264, lng: 80.1927 } },
  { city: "Pondicherry", state: "Puducherry", coordinates: { lat: 11.9416, lng: 79.8083 } },
  { city: "Hampi", state: "Karnataka", coordinates: { lat: 15.3350, lng: 76.4600 } },
  { city: "Gokarna", state: "Karnataka", coordinates: { lat: 14.5500, lng: 74.3167 } },
  { city: "Mysore", state: "Karnataka", coordinates: { lat: 12.2958, lng: 76.6394 } },
  { city: "Alleppey", state: "Kerala", coordinates: { lat: 9.4981, lng: 76.3388 } },
  { city: "Munnar", state: "Kerala", coordinates: { lat: 10.0889, lng: 77.0595 } },
  { city: "Wayanad", state: "Kerala", coordinates: { lat: 11.6854, lng: 76.1320 } },
  { city: "Kovalam", state: "Kerala", coordinates: { lat: 8.3667, lng: 76.9969 } },
  { city: "Varkala", state: "Kerala", coordinates: { lat: 8.7379, lng: 76.7163 } },
  { city: "Darjeeling", state: "West Bengal", coordinates: { lat: 27.0360, lng: 88.2627 } },
  { city: "Kalimpong", state: "West Bengal", coordinates: { lat: 27.0706, lng: 88.4753 } },
  { city: "Shillong", state: "Meghalaya", coordinates: { lat: 25.5788, lng: 91.8933 } },
  { city: "Cherrapunji", state: "Meghalaya", coordinates: { lat: 25.3000, lng: 91.7000 } },
  { city: "Kaziranga", state: "Assam", coordinates: { lat: 26.6141, lng: 93.1714 } },
  { city: "Goa", state: "Goa", coordinates: { lat: 15.2993, lng: 74.1240 } },
  { city: "Calangute", state: "Goa", coordinates: { lat: 15.5439, lng: 73.7553 } },
  { city: "Anjuna", state: "Goa", coordinates: { lat: 15.5833, lng: 73.7500 } },
  { city: "Palolem", state: "Goa", coordinates: { lat: 15.0100, lng: 74.0239 } },
  { city: "Khajuraho", state: "Madhya Pradesh", coordinates: { lat: 24.8510, lng: 79.9333 } },
  { city: "Orchha", state: "Madhya Pradesh", coordinates: { lat: 25.3500, lng: 78.6400 } },
  { city: "Ajanta", state: "Maharashtra", coordinates: { lat: 20.5519, lng: 75.7033 } },
  { city: "Ellora", state: "Maharashtra", coordinates: { lat: 20.0264, lng: 75.1792 } },
  { city: "Lonavala", state: "Maharashtra", coordinates: { lat: 18.7500, lng: 73.4167 } },
  { city: "Khandala", state: "Maharashtra", coordinates: { lat: 18.7500, lng: 73.3833 } },
  { city: "Mahabaleshwar", state: "Maharashtra", coordinates: { lat: 17.9239, lng: 73.6583 } },
  { city: "Alibaug", state: "Maharashtra", coordinates: { lat: 18.6414, lng: 72.8722 } },
  { city: "Dwarka", state: "Gujarat", coordinates: { lat: 22.2403, lng: 68.9686 } },
  { city: "Somnath", state: "Gujarat", coordinates: { lat: 20.8883, lng: 70.4011 } },
  { city: "Saputara", state: "Gujarat", coordinates: { lat: 20.5800, lng: 73.7500 } },
  { city: "Kutch", state: "Gujarat", coordinates: { lat: 23.7338, lng: 70.8414 } },
  { city: "Jaisalmer", state: "Rajasthan", coordinates: { lat: 26.9117, lng: 70.9128 } },
  { city: "Bikaner", state: "Rajasthan", coordinates: { lat: 28.0229, lng: 73.3119 } },
  { city: "Ajmer", state: "Rajasthan", coordinates: { lat: 26.4499, lng: 74.6399 } },
  { city: "Chittorgarh", state: "Rajasthan", coordinates: { lat: 24.8883, lng: 74.6269 } },
  { city: "Bundi", state: "Rajasthan", coordinates: { lat: 25.4381, lng: 75.6378 } },
  { city: "Kota", state: "Rajasthan", coordinates: { lat: 25.2138, lng: 75.8648 } },
  { city: "Bharatpur", state: "Rajasthan", coordinates: { lat: 27.2156, lng: 77.4903 } },
  { city: "Alwar", state: "Rajasthan", coordinates: { lat: 27.5665, lng: 76.6123 } },
  { city: "Sawai Madhopur", state: "Rajasthan", coordinates: { lat: 26.0230, lng: 76.3445 } },
  { city: "Mathura", state: "Uttar Pradesh", coordinates: { lat: 27.4924, lng: 77.6737 } },
  { city: "Vrindavan", state: "Uttar Pradesh", coordinates: { lat: 27.5806, lng: 77.7006 } },
  { city: "Ayodhya", state: "Uttar Pradesh", coordinates: { lat: 26.7924, lng: 82.1948 } },
  { city: "Sarnath", state: "Uttar Pradesh", coordinates: { lat: 25.3753, lng: 83.0239 } },
  { city: "Bodh Gaya", state: "Bihar", coordinates: { lat: 24.6951, lng: 84.9874 } },
  { city: "Nalanda", state: "Bihar", coordinates: { lat: 25.1358, lng: 85.4449 } },
  { city: "Rajgir", state: "Bihar", coordinates: { lat: 25.0186, lng: 85.4208 } },
  { city: "Puri", state: "Odisha", coordinates: { lat: 19.8134, lng: 85.8315 } },
  { city: "Konark", state: "Odisha", coordinates: { lat: 19.8876, lng: 86.0945 } },
  { city: "Bhubaneswar", state: "Odisha", coordinates: { lat: 20.2961, lng: 85.8245 } },
  { city: "Tirupati", state: "Andhra Pradesh", coordinates: { lat: 13.6288, lng: 79.4192 } },
  { city: "Vijayawada", state: "Andhra Pradesh", coordinates: { lat: 16.5062, lng: 80.6480 } },
  { city: "Warangal", state: "Telangana", coordinates: { lat: 18.0000, lng: 79.5881 } },
  { city: "Mysore", state: "Karnataka", coordinates: { lat: 12.2958, lng: 76.6394 } },
  { city: "Belur", state: "Karnataka", coordinates: { lat: 13.1656, lng: 75.8650 } },
  { city: "Halebid", state: "Karnataka", coordinates: { lat: 13.2167, lng: 75.9833 } },
  { city: "Badami", state: "Karnataka", coordinates: { lat: 15.9200, lng: 75.6800 } },
  { city: "Pattadakal", state: "Karnataka", coordinates: { lat: 15.9486, lng: 75.8167 } },
  { city: "Mahabalipuram", state: "Tamil Nadu", coordinates: { lat: 12.6264, lng: 80.1927 } },
  { city: "Thanjavur", state: "Tamil Nadu", coordinates: { lat: 10.7867, lng: 79.1378 } },
  { city: "Kanchipuram", state: "Tamil Nadu", coordinates: { lat: 12.8342, lng: 79.7036 } },
  { city: "Rameswaram", state: "Tamil Nadu", coordinates: { lat: 9.2881, lng: 79.3128 } },
  { city: "Kanyakumari", state: "Tamil Nadu", coordinates: { lat: 8.0883, lng: 77.5385 } },
  { city: "Madurai", state: "Tamil Nadu", coordinates: { lat: 9.9252, lng: 78.1198 } },
  { city: "Thiruvananthapuram", state: "Kerala", coordinates: { lat: 8.5241, lng: 76.9366 } },
  { city: "Kochi", state: "Kerala", coordinates: { lat: 9.9312, lng: 76.2673 } },
  { city: "Kozhikode", state: "Kerala", coordinates: { lat: 11.2588, lng: 75.7804 } },
  { city: "Thrissur", state: "Kerala", coordinates: { lat: 10.5276, lng: 76.2144 } },
  { city: "Palakkad", state: "Kerala", coordinates: { lat: 10.7867, lng: 76.6548 } },
  { city: "Kannur", state: "Kerala", coordinates: { lat: 11.8745, lng: 75.3704 } },
  { city: "Kasaragod", state: "Kerala", coordinates: { lat: 12.4994, lng: 74.9896 } },
  { city: "Alappuzha", state: "Kerala", coordinates: { lat: 9.4981, lng: 76.3388 } },
  { city: "Kollam", state: "Kerala", coordinates: { lat: 8.8932, lng: 76.6141 } },
  { city: "Pathanamthitta", state: "Kerala", coordinates: { lat: 9.2647, lng: 76.7872 } },
  { city: "Kottayam", state: "Kerala", coordinates: { lat: 9.5916, lng: 76.5222 } },
  { city: "Idukki", state: "Kerala", coordinates: { lat: 9.8497, lng: 76.9400 } },
  { city: "Ernakulam", state: "Kerala", coordinates: { lat: 9.9312, lng: 76.2673 } },
  { city: "Malappuram", state: "Kerala", coordinates: { lat: 11.0404, lng: 76.0819 } },
  { city: "Wayanad", state: "Kerala", coordinates: { lat: 11.6854, lng: 76.1320 } },
  { city: "Kannur", state: "Kerala", coordinates: { lat: 11.8745, lng: 75.3704 } },
  { city: "Kasaragod", state: "Kerala", coordinates: { lat: 12.4994, lng: 74.9896 } },
];

// Build city map for fast lookup
const cityMap = new Map<string, IndianCity>();
indianCities.forEach((city) => {
  cityMap.set(city.city.toLowerCase(), city);
});

/**
 * Get city by name (case-insensitive)
 */
export function getCityByName(name: string): IndianCity | undefined {
  if (!name || typeof name !== "string") {
    return undefined;
  }
  return cityMap.get(name.trim().toLowerCase());
}

/**
 * Get cities by state (case-insensitive)
 */
export function getCitiesByState(state: string): IndianCity[] {
  if (!state || typeof state !== "string") {
    return [];
  }
  const normalizedState = state.trim().toLowerCase();
  return indianCities.filter((city) => city.state.toLowerCase() === normalizedState);
}

/**
 * Get all cities
 */
export function getAllCities(): IndianCity[] {
  return [...indianCities];
}

/**
 * Check if city exists
 */
export function isIndianCity(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }
  return cityMap.has(name.trim().toLowerCase());
}

/**
 * Get total number of cities
 */
export function getTotalCitiesCount(): number {
  return indianCities.length;
}

/**
 * Search cities by name (partial match, case-insensitive)
 */
export function searchCities(query: string): IndianCity[] {
  if (!query || typeof query !== "string") {
    return [];
  }
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }
  return indianCities.filter((city) => city.city.toLowerCase().includes(normalizedQuery));
}

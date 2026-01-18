interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  conditions: string;
  location: string;
}

interface WeatherCardProps {
  weather: WeatherData;
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm">
      <h3 className="text-xl font-bold text-gray-800">{weather.location}</h3>
      <p className="text-gray-500 mb-4">{weather.conditions}</p>
      <div className="text-5xl font-light text-gray-900 mb-4">
        {Math.round(weather.temperature)}°C
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Feels like</p>
          <p className="font-medium">{Math.round(weather.feelsLike)}°C</p>
        </div>
        <div>
          <p className="text-gray-500">Humidity</p>
          <p className="font-medium">{weather.humidity}%</p>
        </div>
        <div>
          <p className="text-gray-500">Wind</p>
          <p className="font-medium">{weather.windSpeed} km/h</p>
        </div>
      </div>
    </div>
  );
}

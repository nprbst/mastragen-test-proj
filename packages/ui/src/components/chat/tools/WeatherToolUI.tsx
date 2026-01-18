import React from 'react';
import { makeAssistantToolUI } from '@assistant-ui/react';
import { Cloud, Droplets, Wind, Thermometer, Sun, CloudRain, Snowflake, CloudLightning } from 'lucide-react';

interface WeatherResult {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  conditions: string;
  location: string;
}

interface WeatherArgs {
  location: string;
}

function getWeatherIcon(conditions: string) {
  const lower = conditions.toLowerCase();
  if (lower.includes('clear') || lower.includes('sunny')) {
    return <Sun className="w-6 h-6 text-accent-amber" />;
  }
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return <CloudRain className="w-6 h-6 text-accent-cyan" />;
  }
  if (lower.includes('snow') || lower.includes('sleet') || lower.includes('hail')) {
    return <Snowflake className="w-6 h-6 text-accent-secondary" />;
  }
  if (lower.includes('thunder') || lower.includes('storm')) {
    return <CloudLightning className="w-6 h-6 text-accent-amber" />;
  }
  return <Cloud className="w-6 h-6 text-text-secondary" />;
}

export const WeatherToolUI = makeAssistantToolUI<WeatherArgs, WeatherResult>({
  toolName: 'get-weather',
  render: ({ args, result, status }) => {
    if (status.type === 'requires-action') {
      return (
        <div className="card animate-pulse">
          <div className="flex items-center gap-2 text-text-secondary">
            <Cloud className="w-5 h-5 animate-bounce" />
            <span>Preparing to fetch weather for {args.location}...</span>
          </div>
        </div>
      );
    }

    if (status.type === 'running') {
      return (
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-card bg-accent-primary/20 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-accent-primary animate-pulse" />
            </div>
            <div>
              <p className="text-text-primary font-normal">Fetching weather data...</p>
              <p className="text-text-secondary text-sm">{args.location}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div className="h-full bg-gradient-brand rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      );
    }

    if (status.type === 'incomplete') {
      return (
        <div className="card border-accent-rose/50">
          <div className="flex items-center gap-2 text-accent-rose">
            <Cloud className="w-5 h-5" />
            <span>Failed to fetch weather for {args.location}</span>
          </div>
          {status.reason === 'error' && (
            <p className="text-text-secondary text-sm mt-2">
              Please try again or check the location name.
            </p>
          )}
        </div>
      );
    }

    if (status.type === 'complete' && result) {
      return <WeatherCard weather={result} />;
    }

    return null;
  },
});

function WeatherCard({ weather }: { weather: WeatherResult }) {
  return (
    <div className="card group hover:border-accent-primary/50">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-semibold text-text-primary">{weather.location}</h3>
          <p className="text-text-secondary flex items-center gap-2 mt-1">
            {getWeatherIcon(weather.conditions)}
            {weather.conditions}
          </p>
        </div>
        <div className="w-14 h-14 rounded-card bg-gradient-brand flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
          {getWeatherIcon(weather.conditions)}
        </div>
      </div>

      <div className="mb-6">
        <span className="text-5xl font-light text-text-primary">
          {Math.round(weather.temperature)}
        </span>
        <span className="text-2xl text-text-secondary ml-1">°C</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatItem
          icon={<Thermometer className="w-4 h-4" />}
          label="Feels like"
          value={`${Math.round(weather.feelsLike)}°C`}
        />
        <StatItem
          icon={<Droplets className="w-4 h-4" />}
          label="Humidity"
          value={`${weather.humidity}%`}
        />
        <StatItem
          icon={<Wind className="w-4 h-4" />}
          label="Wind"
          value={`${Math.round(weather.windSpeed)} km/h`}
        />
        <StatItem
          icon={<Wind className="w-4 h-4" />}
          label="Gusts"
          value={`${Math.round(weather.windGust)} km/h`}
        />
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
      <div className="text-text-secondary">{icon}</div>
      <div>
        <p className="text-text-muted text-xs uppercase tracking-wide">{label}</p>
        <p className="text-text-primary font-normal">{value}</p>
      </div>
    </div>
  );
}

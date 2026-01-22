import React from 'react';
import {
  Cloud,
  Droplets,
  Thermometer,
  Sun,
  CloudRain,
  Snowflake,
  CloudLightning,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { WeatherForecast, WeatherWorkflowResult } from '../../lib/mastra-workflow-client';

interface WeatherDashboardProps {
  result: WeatherWorkflowResult | null;
  isLoading: boolean;
  error: string | null;
}

function getWeatherIcon(conditions: string) {
  const lower = conditions.toLowerCase();
  if (lower.includes('clear') || lower.includes('sunny')) {
    return <Sun className="w-8 h-8 text-accent-amber" />;
  }
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return <CloudRain className="w-8 h-8 text-accent-cyan" />;
  }
  if (lower.includes('snow') || lower.includes('sleet') || lower.includes('hail')) {
    return <Snowflake className="w-8 h-8 text-accent-secondary" />;
  }
  if (lower.includes('thunder') || lower.includes('storm')) {
    return <CloudLightning className="w-8 h-8 text-accent-amber" />;
  }
  return <Cloud className="w-8 h-8 text-text-secondary" />;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function WeatherDashboard({ result, isLoading, error }: WeatherDashboardProps) {
  if (error) {
    return (
      <div className="card border-accent-rose/50">
        <div className="flex items-center gap-3 text-accent-rose">
          <AlertCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Error</h3>
            <p className="text-text-secondary text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!result) {
    return null;
  }

  const { forecast, activities } = result;

  return (
    <div className="space-y-6">
      <ForecastCard forecast={forecast} />
      <ActivitiesCard activities={activities} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card animate-pulse">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-bg-tertiary rounded" />
            <div className="h-4 w-48 bg-bg-tertiary rounded" />
          </div>
          <div className="w-16 h-16 bg-bg-tertiary rounded-card" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-bg-tertiary rounded-lg">
              <div className="h-3 w-16 bg-bg-secondary rounded mb-2" />
              <div className="h-6 w-20 bg-bg-secondary rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="card animate-pulse">
        <div className="h-5 w-40 bg-bg-tertiary rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-bg-tertiary rounded" style={{ width: `${100 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ForecastCard({ forecast }: { forecast: WeatherForecast }) {
  return (
    <div className="card group hover:border-accent-primary/50 transition-colors">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent-primary" />
            {forecast.location}
          </h2>
          <p className="text-text-secondary flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            {formatDate(forecast.date)}
          </p>
        </div>
        <div className="w-16 h-16 rounded-card bg-gradient-brand flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
          {getWeatherIcon(forecast.condition)}
        </div>
      </div>

      <p className="text-text-primary text-lg mb-6 flex items-center gap-2">
        {getWeatherIcon(forecast.condition)}
        {forecast.condition}
      </p>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Thermometer className="w-5 h-5" />}
          label="High"
          value={`${Math.round(forecast.maxTemp)}°C`}
          accent="text-accent-rose"
        />
        <StatCard
          icon={<Thermometer className="w-5 h-5" />}
          label="Low"
          value={`${Math.round(forecast.minTemp)}°C`}
          accent="text-accent-cyan"
        />
        <StatCard
          icon={<Droplets className="w-5 h-5" />}
          label="Rain"
          value={`${forecast.precipitationChance}%`}
          accent="text-accent-primary"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="p-4 bg-bg-tertiary rounded-lg">
      <div className={`flex items-center gap-2 ${accent} mb-1`}>
        {icon}
        <span className="text-text-muted text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-text-primary text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ActivitiesCard({ activities }: { activities: string }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-accent-primary" />
        Suggested Activities
      </h3>
      <div className="bg-bg-tertiary rounded-lg p-6 overflow-auto max-h-[600px]">
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-text-primary mb-4 mt-6 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold text-text-primary mb-3 mt-5 border-b border-border-color pb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">{children}</h3>
              ),
              p: ({ children }) => <p className="text-text-secondary mb-3 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-text-secondary ml-2">{children}</li>,
              strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-accent-primary italic">{children}</em>,
              code: ({ children }) => (
                <code className="bg-bg-secondary px-1.5 py-0.5 rounded text-accent-primary font-mono text-sm">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-bg-secondary p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-accent-primary pl-4 italic text-text-secondary mb-3">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="border-border-color my-4" />,
            }}
          >
            {activities}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

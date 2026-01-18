import React, { useState } from 'react';
import { MapPin, Play, Loader2 } from 'lucide-react';
import { WeatherDashboard } from './WeatherDashboard';
import { runWeatherWorkflow, type WeatherWorkflowResult } from '../../lib/mastra-workflow-client';

export default function WeatherWorkflowRunner() {
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WeatherWorkflowResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const workflowResult = await runWeatherWorkflow(city.trim());
      setResult(workflowResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter a city name..."
              className="w-full pl-10 pr-4 py-3 bg-bg-tertiary border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !city.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-brand text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Workflow
              </>
            )}
          </button>
        </div>
      </form>

      <WeatherDashboard result={result} isLoading={isLoading} error={error} />
    </div>
  );
}

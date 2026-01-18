import { useState } from 'react';
import { executeWorkflow } from '../lib/mastra-client';

interface InputField {
  name: string;
  type: string;
  description?: string;
}

interface WorkflowRunnerProps {
  workflowId: string;
  workflowName: string;
  inputFields: InputField[];
}

export default function WorkflowRunner({
  workflowId,
  workflowName,
  inputFields,
}: WorkflowRunnerProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const response = await executeWorkflow(workflowId, inputs);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workflow execution failed');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">{workflowName}</h3>
      <div className="space-y-4 mb-4">
        {inputFields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.name}
              {field.description && (
                <span className="text-gray-400 font-normal ml-1">({field.description})</span>
              )}
            </label>
            <input
              type="text"
              value={inputs[field.name] || ''}
              onChange={(e) => setInputs({ ...inputs, [field.name]: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder={`Enter ${field.name}`}
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleRun}
        disabled={isRunning}
        className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {isRunning ? 'Running...' : 'Run Workflow'}
      </button>
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium mb-2">Result:</h4>
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

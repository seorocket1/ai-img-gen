import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: number;
  steps: string[];
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  index < currentStep
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white shadow-lg'
                    : index === currentStep
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-gray-300 text-gray-400 bg-white'
                }`}
              >
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              <span
                className={`ml-3 text-sm font-medium ${
                  index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 transition-all duration-300 ${
                  index < currentStep ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-300'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
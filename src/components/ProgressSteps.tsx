import React from 'react';
import { Check, Sparkles, FileText, Wand2 } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: number;
  steps: string[];
}

const stepIcons = [Sparkles, FileText, Wand2];

export const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center space-x-4 max-w-2xl w-full">
        {steps.map((step, index) => {
          const Icon = stepIcons[index] || Sparkles;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          
          return (
            <React.Fragment key={index}>
              <div className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-500 ${
                    isCompleted
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white shadow-lg scale-110'
                      : isCurrent
                      ? 'border-blue-600 text-blue-600 bg-blue-50 shadow-md scale-105 animate-pulse'
                      : 'border-gray-300 text-gray-400 bg-white hover:border-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 animate-in zoom-in duration-300" />
                  ) : (
                    <Icon className={`w-6 h-6 ${isCurrent ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <span
                    className={`text-sm font-semibold transition-colors duration-300 ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step}
                  </span>
                  {isCurrent && (
                    <div className="mt-1">
                      <div className="w-full bg-blue-100 rounded-full h-1">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 transition-all duration-500 ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm' 
                      : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
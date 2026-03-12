import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description: string;
}

interface InvoiceWizardStepperProps {
  steps: Step[];
  currentStep: number;
}

export default function InvoiceWizardStepper({ steps, currentStep }: InvoiceWizardStepperProps) {
  return (
    <nav aria-label="Progresso" className="mb-8">
      {/* Desktop stepper */}
      <ol className="hidden sm:flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <li key={index} className={cn("flex items-center", index < steps.length - 1 && "flex-1")}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary ring-4 ring-primary/10",
                    !isCompleted && !isCurrent && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-xs font-medium leading-tight",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-3 mt-[-1rem] transition-colors duration-300",
                  isCompleted ? "bg-primary" : "bg-border"
                )} />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile stepper */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Etapa {currentStep + 1} de {steps.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {steps[currentStep].label}
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {steps[currentStep].description}
        </p>
      </div>
    </nav>
  );
}

import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export function FirstRunGuide(): React.ReactElement {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Getting Started
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Move from an authorized target to your first signal.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Configure one controlled API test in a few focused moves. Start
              with a development or staging target you own or are authorized to
              test.
            </p>
            <div className="pt-2">
              <a
                href="#project-name"
                className="inline-flex items-center text-sm font-semibold text-primary hover:underline group"
              >
                Create your first project
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex gap-3.5 p-4 rounded-lg bg-surface border border-border">
              <span className="font-mono text-xs font-bold text-muted-foreground pt-0.5">
                01
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Name the work
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Give the API or workload a project home.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 p-4 rounded-lg bg-surface border border-border">
              <span className="font-mono text-xs font-bold text-muted-foreground pt-0.5">
                02
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Set a target
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save the environment you're allowed to test.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 p-4 rounded-lg bg-surface border border-border">
              <span className="font-mono text-xs font-bold text-muted-foreground pt-0.5">
                03
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Add one endpoint
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Begin with the request that matters most.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 p-4 rounded-lg bg-surface border border-border">
              <span className="font-mono text-xs font-bold text-muted-foreground pt-0.5">
                04
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Run with limits
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review the rate, then inspect the result.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

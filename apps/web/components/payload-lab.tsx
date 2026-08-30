'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  Code2,
  Copy,
  Database,
  FileCode2,
  MessageSquareQuote,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { apiRequest, type Endpoint } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface PayloadLabProps {
  readonly projectId: string;
  readonly endpoints: readonly Endpoint[];
}

interface PayloadPreset {
  readonly name: string;
  readonly description: string;
  readonly sample: string;
}

const PRESETS: readonly PayloadPreset[] = [
  {
    name: '🛍️ Checkout Orders',
    description:
      'High-value e-commerce checkout orders with multi-currency, discount codes, shipping tiers, and line items.',
    sample: JSON.stringify(
      {
        orderId: 'ord_98765',
        customer: { name: 'Alex Smith', email: 'alex@example.test', tier: 'VIP' },
        currency: 'USD',
        items: [
          { sku: 'ITEM-01', name: 'Mechanical Keyboard', qty: 1, price: 149.99 },
          { sku: 'ITEM-02', name: 'USB-C Cable', qty: 2, price: 19.99 },
        ],
        totalAmount: 189.97,
        shippingAddress: { country: 'US', city: 'San Francisco', zip: '94107' },
      },
      null,
      2
    ),
  },
  {
    name: '🔐 Auth & Edge Cases',
    description:
      'Login and session token validation requests with realistic edge cases, SQL/XSS probes, and special characters.',
    sample: JSON.stringify(
      {
        username: 'qa.testuser.99',
        email: 'qa.user@corp.internal',
        deviceFingerprint: 'fp_a8f9c01b',
        attemptOrigin: '192.168.1.100',
        rememberMe: true,
      },
      null,
      2
    ),
  },
  {
    name: '💳 Payment Transaction',
    description:
      'Payment gateway charge authorizations with card brand varieties, billing addresses, and 3DS challenge states.',
    sample: JSON.stringify(
      {
        transactionId: 'txn_live_9921',
        amountCents: 4999,
        currency: 'EUR',
        paymentMethod: 'card',
        cardBrand: 'visa',
        status: 'authorized',
      },
      null,
      2
    ),
  },
  {
    name: '👤 User Profile / KYC',
    description:
      'Customer account onboarding data with age verification, contact numbers, and KYC compliance status.',
    sample: JSON.stringify(
      {
        userId: 'usr_5510',
        fullName: 'Jordan Taylor',
        dateOfBirth: '1992-05-14',
        kycLevel: 'TIER_2',
        verifiedPhone: '+1-555-0199',
        locale: 'en-US',
      },
      null,
      2
    ),
  },
];

export function PayloadLab({
  projectId,
  endpoints,
}: PayloadLabProps): React.ReactElement {
  const [description, setDescription] = useState(
    'E-commerce order checkout with realistic customer profiles, varied cart items, currency codes, and delivery addresses'
  );
  const [sample, setSample] = useState(PRESETS[0]?.sample ?? '');
  const [count, setCount] = useState(100);
  const [schema, setSchema] = useState('');
  const [fieldRules, setFieldRules] = useState('');
  const [estimate, setEstimate] = useState<{
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
  } | null>(null);
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedPayloads, setGeneratedPayloads] = useState<
    readonly Record<string, unknown>[]
  >([]);
  const [endpointId, setEndpointId] = useState('');
  const [templateName, setTemplateName] = useState('Generated payloads');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const parseJsonSafe = (
    text: string,
    fieldName: string
  ): Record<string, unknown> | null => {
    if (text.trim() === '') return null;
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch (err) {
      throw new Error(
        `Invalid JSON in ${fieldName}: ${err instanceof Error ? err.message : 'Syntax error'}`
      );
    }
  };

  const applyPreset = (preset: PayloadPreset): void => {
    setDescription(preset.description);
    setSample(preset.sample);
    setTemplateName(preset.name.replace(/^[^\w\s]+/u, '').trim() + ' Payloads');
    if (errorMessage) setErrorMessage('');
  };

  const generate = async (): Promise<void> => {
    setErrorMessage('');
    setIsGenerating(true);
    try {
      const parsedSample = parseJsonSafe(sample, 'Sample Seed JSON');
      const parsedSchema = parseJsonSafe(schema, 'JSON Schema');
      const parsedRules = parseJsonSafe(fieldRules, 'Field Rules');

      if (count < 1 || count > 10_000) {
        throw new Error('Payload count must be between 1 and 10,000');
      }

      if (
        !description.trim() &&
        !parsedSample &&
        !parsedSchema
      ) {
        throw new Error(
          'Please describe the payload type or provide a seed sample JSON.'
        );
      }

      const result = await apiRequest<{
        payloads: readonly Record<string, unknown>[];
        seedCount: number;
      }>('/payloads/generate', {
        method: 'POST',
        body: JSON.stringify({
          description: description.trim(),
          ...(parsedSample ? { sample: parsedSample } : {}),
          ...(parsedSchema ? { schema: parsedSchema } : {}),
          ...(parsedRules ? { fieldRules: parsedRules } : {}),
          count,
          seedCount: Math.min(25, count),
        }),
      });
      setGeneratedPayloads(result.payloads);
      setOutput(JSON.stringify(result.payloads.slice(0, 5), null, 2));
    } catch (caught: unknown) {
      setErrorMessage(
        caught instanceof Error ? caught.message : 'Payload generation failed'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const estimateTokens = async (): Promise<void> => {
    setErrorMessage('');
    setIsEstimating(true);
    try {
      const parsedSample = parseJsonSafe(sample, 'Sample Seed JSON');
      const parsedSchema = parseJsonSafe(schema, 'JSON Schema');

      const result = await apiRequest<{
        estimatedInputTokens: number;
        estimatedOutputTokens: number;
      }>('/payloads/estimate', {
        method: 'POST',
        body: JSON.stringify({
          description: description.trim(),
          ...(parsedSample ? { sample: parsedSample } : {}),
          ...(parsedSchema ? { schema: parsedSchema } : {}),
          count,
          seedCount: Math.min(25, count),
        }),
      });
      setEstimate(result);
    } catch (caught: unknown) {
      setErrorMessage(
        caught instanceof Error ? caught.message : 'Token estimation failed'
      );
    } finally {
      setIsEstimating(false);
    }
  };

  const saveTemplate = async (): Promise<void> => {
    if (templateName.trim() === '') {
      setErrorMessage('Template name cannot be blank');
      return;
    }
    if (endpointId === '') {
      setErrorMessage('Please select a target endpoint for this template');
      return;
    }
    setErrorMessage('');
    setIsSavingTemplate(true);
    try {
      await apiRequest('/payload-templates', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          endpointId,
          name: templateName.trim(),
          payloads: generatedPayloads,
          source: 'AI',
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (caught: unknown) {
      setErrorMessage(
        caught instanceof Error ? caught.message : 'Failed to save template'
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const copyToClipboard = async (): Promise<void> => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Synthetic Intelligence
          </span>
          <CardTitle className="text-xl font-bold flex items-center gap-2 mt-0.5">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Payload Studio
          </CardTitle>
          <CardDescription>
            Describe the payload type or scenario in plain English to generate
            realistic test batches.
          </CardDescription>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          AI Seed + Scale Expansion
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {errorMessage !== '' && (
          <div
            className="flex items-center justify-between p-3 rounded-md border border-destructive/30 bg-destructive/10 text-xs text-foreground animate-fade-in"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Authoring Controls */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Step 1: Natural Language Prompt / Type */}
            <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    1. Describe Payload Type & Scenario
                  </h3>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Natural Language Prompt
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  What kind of payload do you want to generate?
                </label>
                <Textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  rows={2}
                  placeholder="e.g. High-value international checkout transactions with coupon discounts, multi-currency, and guest checkout flags..."
                  className="bg-card text-xs"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                  Quick Scenario Presets:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-2.5 py-1 text-xs rounded-md bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Seed Sample JSON & Schema (Optional) */}
            <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  2. Seed Sample JSON & Schema (Optional)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Seed Sample JSON
                  </label>
                  <Textarea
                    value={sample}
                    onChange={(event) => {
                      setSample(event.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    rows={5}
                    placeholder='{\n  "name": "Jane Doe",\n  "email": "jane@example.com"\n}'
                    className="font-mono text-xs bg-card"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    JSON Schema (Optional)
                  </label>
                  <Textarea
                    value={schema}
                    onChange={(event) => {
                      setSchema(event.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    rows={5}
                    placeholder='{"type":"object","properties":{"age":{"type":"integer"}}}'
                    className="font-mono text-xs bg-card"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Generation Constraints & Estimation */}
            <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  3. Generation Constraints & Estimation
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Field Rules (JSON Constraints)
                  </label>
                  <Input
                    value={fieldRules}
                    onChange={(event) => {
                      setFieldRules(event.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder='{"age":"18 to 65"}'
                    className="bg-card font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Payload Batch Count (1 - 10,000)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10_000}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                    className="bg-card"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isEstimating}
                    onClick={() => void estimateTokens()}
                    className="text-xs"
                  >
                    {isEstimating ? 'Estimating…' : 'Estimate Token Cost'}
                  </Button>
                  {estimate !== null && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      ~{estimate.estimatedInputTokens.toLocaleString()} in /{' '}
                      {estimate.estimatedOutputTokens.toLocaleString()} out
                    </Badge>
                  )}
                </div>

                <Button
                  disabled={isGenerating}
                  onClick={() => void generate()}
                  className="text-xs font-bold"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {isGenerating
                    ? 'Generating Synthetic Batches…'
                    : 'Generate Payloads'}
                </Button>
              </div>
            </div>

            {/* Step 4: Save as Reusable Template */}
            <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  4. Save as Reusable Template
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Target Endpoint
                  </label>
                  <select
                    value={endpointId}
                    onChange={(event) => setEndpointId(event.target.value)}
                    className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Select target endpoint…</option>
                    {endpoints.map((endpoint) => (
                      <option key={endpoint.id} value={endpoint.id}>
                        {endpoint.method} {endpoint.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Template Name
                  </label>
                  <Input
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    placeholder="e.g. Edge Case High-Variability Seed"
                    className="bg-card"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={
                    generatedPayloads.length === 0 ||
                    endpointId === '' ||
                    isSavingTemplate
                  }
                  onClick={() => void saveTemplate()}
                  className="text-xs"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {isSavingTemplate
                    ? 'Saving Reusable Template…'
                    : `Save Reusable Version (${generatedPayloads.length} items)`}
                </Button>

                {savedSuccess && (
                  <span className="text-xs font-semibold text-success flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Template saved!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Batch Preview */}
          <div className="lg:col-span-5 flex flex-col p-4 rounded-lg bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileCode2 className="h-4 w-4" />
                Batch Preview
              </span>
              <div className="flex items-center gap-2">
                {generatedPayloads.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyToClipboard()}
                    className="h-7 px-2.5 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-success" />{' '}
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy JSON
                      </>
                    )}
                  </Button>
                )}
                <Badge
                  variant={generatedPayloads.length > 0 ? 'success' : 'muted'}
                  className="text-[11px]"
                >
                  {generatedPayloads.length > 0
                    ? `${generatedPayloads.length} generated`
                    : 'Awaiting generation'}
                </Badge>
              </div>
            </div>

            <pre className="flex-1 min-h-[300px] max-h-[550px] overflow-auto p-3.5 rounded-md bg-card border border-border text-xs text-foreground font-mono leading-relaxed">
              {output ||
                '// Generated payload batches will be previewed here in JSON format.\n// Describe the payload above and click "Generate Payloads".'}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Hash, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileVerificationResult } from '@/lib/crypto/file-integrity';
import { toast } from 'sonner';

interface FileVerifiedBadgeProps {
  verification: FileVerificationResult | null;
  isCalculating?: boolean;
  detectedBankName?: string;
  error?: string | null;
}

export function FileVerifiedBadge({
  verification,
  isCalculating,
  detectedBankName,
  error,
}: FileVerifiedBadgeProps) {
  const [copied, setCopied] = useState(false);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (isCalculating) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-primary/[0.04] border border-primary/20 text-xs text-muted-foreground animate-pulse">
        <Hash className="h-4 w-4 animate-spin text-primary shrink-0" />
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">Calculando huella de integridad SHA-256...</span>
          <span className="text-[11px] text-muted-foreground">Web Crypto API directa en tu navegador</span>
        </div>
      </div>
    );
  }

  if (!verification) return null;

  const shortHash = `${verification.sha256Hex.slice(0, 10)}...${verification.sha256Hex.slice(-10)}`;
  const sizeMb = (verification.fileSizeBytes / (1024 * 1024)).toFixed(2);

  const handleCopy = () => {
    navigator.clipboard.writeText(verification.sha256Hex);
    setCopied(true);
    toast.success('Huella SHA-256 copiada al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/25 text-xs shadow-xs">
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate max-w-[220px] sm:max-w-[320px]">
              {verification.fileName}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            >
              SHA-256 Verificado
            </Badge>
            {detectedBankName && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {detectedBankName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
            <span className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
              {shortHash}
            </span>
            <span>·</span>
            <span>{sizeMb} MB</span>
            <span>·</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(verification.calculatedAt).toLocaleTimeString('es-CO')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2.5 text-xs bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                    <span className="text-emerald-600 font-medium">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    <span>Copiar Hash</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[340px] break-all font-mono text-[11px] p-2">
              <p className="font-semibold mb-1 text-foreground">Hash SHA-256 completo:</p>
              {verification.sha256Hex}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

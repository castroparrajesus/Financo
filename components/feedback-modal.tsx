'use client';

import { useState, useEffect } from 'react';
import { MessageSquarePlus, Star, Send, CheckCircle2, Download, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';

export interface TesterFeedback {
  id: string;
  rating: number;
  category: string;
  comments: string;
  suggestions: string;
  userName: string;
  userEmail: string;
  userRole: string;
  createdAt: string;
}

const FEEDBACK_STORAGE_KEY = 'financo_testers_feedback_v1';

export function getStoredFeedbacks(): TesterFeedback[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFeedback(fb: TesterFeedback) {
  if (typeof window === 'undefined') return;
  const list = getStoredFeedbacks();
  list.unshift(fb);
  window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(list));
}

export function FeedbackModal() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('conciliacion');
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<TesterFeedback[]>([]);

  useEffect(() => {
    if (open) {
      setFeedbacks(getStoredFeedbacks());
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim() && !suggestions.trim()) {
      toast.error('Por favor escribe al menos un breve comentario u opinión.');
      return;
    }

    setSubmitting(true);
    const newFeedback: TesterFeedback = {
      id: `fb-${Date.now()}`,
      rating,
      category,
      comments: comments.trim(),
      suggestions: suggestions.trim(),
      userName: profile?.full_name || 'Evaluador',
      userEmail: user?.email || 'anonimo@evaluador.com',
      userRole: profile?.role || 'accountant',
      createdAt: new Date().toISOString(),
    };

    saveFeedback(newFeedback);
    setFeedbacks(getStoredFeedbacks());
    setSubmitting(false);
    toast.success('¡Muchas gracias! Tu retroalimentación ha sido registrada exitosamente.');
    setComments('');
    setSuggestions('');
    setOpen(false);
  };

  const handleExportJSON = () => {
    const data = getStoredFeedbacks();
    if (data.length === 0) {
      toast.info('Aún no hay retroalimentaciones registradas.');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retroalimentacion-financo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado con éxito.');
  };

  const handleClearHistory = () => {
    if (confirm('¿Seguro que deseas vaciar el historial de retroalimentaciones locales?')) {
      window.localStorage.removeItem(FEEDBACK_STORAGE_KEY);
      setFeedbacks([]);
      toast.info('Historial vaciado.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-xs sm:text-sm h-9 shadow-sm"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Dar retroalimentación</span>
          {feedbacks.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-primary/20 text-primary">
              {feedbacks.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              {viewHistory ? 'Retroalimentaciones Recibidas' : 'Retroalimentación de la Plataforma'}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setViewHistory(!viewHistory)}
            >
              {viewHistory ? '← Volver al formulario' : `Ver historial (${feedbacks.length})`}
            </Button>
          </div>
          <DialogDescription>
            {viewHistory
              ? 'Opiniones y observaciones registradas por los evaluadores en esta instancia.'
              : 'Ayúdanos a validar y mejorar el sistema. Tu opinión como contador, revisor o evaluador es muy valiosa.'}
          </DialogDescription>
        </DialogHeader>

        {viewHistory ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Total registradas: <strong>{feedbacks.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleExportJSON}>
                  <Download className="h-3.5 w-3.5" />
                  Descargar JSON
                </Button>
                {feedbacks.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={handleClearHistory}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {feedbacks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No hay retroalimentaciones enviadas aún.
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {feedbacks.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/70 p-3 bg-card space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                        {item.userName}
                        <Badge variant="outline" className="text-[10px] py-0">
                          {item.userRole}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < item.rating ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                      <span>{item.userEmail}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleString('es-CO')}</span>
                      <span>•</span>
                      <span className="capitalize font-medium text-primary">{item.category}</span>
                    </div>
                    {item.comments && (
                      <div>
                        <span className="font-semibold text-foreground">¿Qué le gustó? </span>
                        <span className="text-muted-foreground">{item.comments}</span>
                      </div>
                    )}
                    {item.suggestions && (
                      <div>
                        <span className="font-semibold text-foreground">Sugerencias: </span>
                        <span className="text-muted-foreground">{item.suggestions}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Rating Stars */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Calificación general de la experiencia</Label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 rounded transition-transform hover:scale-110 focus:outline-none"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {rating === 5 && '¡Excelente!'}
                  {rating === 4 && 'Muy buena'}
                  {rating === 3 && 'Aceptable'}
                  {rating === 2 && 'Tiene detalles por corregir'}
                  {rating === 1 && 'Difícil de usar o con errores'}
                </span>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm font-semibold">
                ¿Qué módulo o aspecto estás evaluando?
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecciona un aspecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conciliacion">Conciliación automática (Pareo de movimientos)</SelectItem>
                  <SelectItem value="cedula">Cédula contable (Saldos y diferencias NIIF)</SelectItem>
                  <SelectItem value="4x1000_intereses">Detección de 4x1000 e Intereses bancarios</SelectItem>
                  <SelectItem value="archivos">Carga y lectura de archivos Excel / Extractos</SelectItem>
                  <SelectItem value="exportacion">Exportación a PDF y Excel</SelectItem>
                  <SelectItem value="facilidad">Facilidad de uso y claridad visual</SelectItem>
                  <SelectItem value="general">Evaluación general del sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <Label htmlFor="comments" className="text-sm font-semibold">
                ¿Qué te pareció más útil o qué funcionó bien?
              </Label>
              <Textarea
                id="comments"
                rows={2}
                placeholder="Ej: El pareo automático agrupó muy bien los intereses y el 4x1000, la cédula contable cuadró exacto..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            {/* Suggestions */}
            <div className="space-y-1.5">
              <Label htmlFor="suggestions" className="text-sm font-semibold">
                ¿Qué mejorarías, qué dudas tuviste o qué función extra necesitas?
              </Label>
              <Textarea
                id="suggestions"
                rows={2}
                placeholder="Ej: Me gustaría poder filtrar por rango de fechas más fácilmente, o tener un botón para..."
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-secondary/40 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
              <div>
                Enviando como: <strong className="text-foreground">{profile?.full_name || user?.email || 'Evaluador'}</strong>
              </div>
              <span className="font-mono text-[11px]">{user?.email}</span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                <Send className="h-4 w-4" />
                {submitting ? 'Guardando...' : 'Enviar retroalimentación'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

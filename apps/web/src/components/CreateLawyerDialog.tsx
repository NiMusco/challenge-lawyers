import { useEffect, useState } from 'react';
import { getFriendlyErrorMessage } from '../lib/friendlyErrorMessage';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

export function CreateLawyerDialog(props: {
  open: boolean;
  onClose: () => void;
  onCreated: (email: string) => void;
  createLawyer: (input: { email: string; fullName: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState('Nuevo Abogado');
  const [email, setEmail] = useState('abogado@ejemplo.com');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (props.open) {
      setError(null);
      setBusy(false);
    }
  }, [props.open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await props.createLawyer({ email: normalizedEmail, fullName: fullName.trim() });
      props.onCreated(normalizedEmail);
      props.onClose();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => (open ? null : props.onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear abogado</DialogTitle>
          <DialogDescription>Se crea con su calendario propio automáticamente.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creando…' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


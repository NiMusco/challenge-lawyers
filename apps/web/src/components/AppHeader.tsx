import type { LawyerRow } from '../types';
import { AvatarCircle } from './AvatarCircle';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';

export function AppHeader(props: {
  title: string;
  lawyers: LawyerRow[];
  lawyerEmail: string;
  onChangeLawyerEmail: (email: string) => void;
  onOpenCreateLawyer: () => void;
}) {
  const selected = props.lawyers.find((l) => l.email === props.lawyerEmail) ?? null;

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <div className="text-lg font-extrabold leading-tight">{props.title}</div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          {selected ? <AvatarCircle seed={selected.email} fullName={selected.fullName} size={34} /> : null}

          <div className="w-[320px] max-w-[40vw]">
            <Select value={props.lawyerEmail} onValueChange={props.onChangeLawyerEmail}>
              <SelectTrigger aria-label="Seleccionar abogado">
                <SelectValue placeholder="Seleccionar abogado" />
              </SelectTrigger>
              <SelectContent>
                {props.lawyers.map((l) => (
                  <SelectItem key={l.id} value={l.email}>
                    {l.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={props.onOpenCreateLawyer}>Crear abogado</Button>
        </div>
      </div>
    </header>
  );
}


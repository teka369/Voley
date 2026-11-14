import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { Eye, EyeOff, Search, X, type LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cop, formatDoc, maskDoc, parseMoney, type ReservationStatus } from "@/lib/domain";
import { useVm } from "@/lib/store";
import { cn } from "@/lib/utils";

const buttonVariants = {
  primary: "bg-primary text-primary-fg",
  secondary: "border border-line bg-surface text-fg",
  ghost: "text-fg",
  danger: "bg-danger text-danger-fg",
} as const;

export function buttonClass(variant: keyof typeof buttonVariants = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50",
    buttonVariants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export const controlClass =
  "h-11 w-full rounded-xl border border-line bg-bg px-3 text-base outline-none placeholder:text-muted";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(props, ref) {
  return <textarea ref={ref} {...props} className={cn(controlClass, "min-h-28 py-3", props.className)} />;
});

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClass, props.className)} />;
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(controlClass, "pl-10")}
        aria-label={placeholder}
      />
    </label>
  );
}

export function MoneyField({
  value,
  onCommit,
  label,
}: {
  value: number;
  onCommit: (n: number) => void;
  label: string;
}) {
  const [text, setText] = useState(value ? String(value) : "");
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(value ? String(value) : "");
  }, [value, focus]);
  return (
    <input
      inputMode="numeric"
      aria-label={label}
      className={cn(controlClass, "tabular-nums")}
      value={focus ? text : value ? cop(value) : ""}
      placeholder="$0"
      onFocus={() => {
        setFocus(true);
        setText(value ? String(value) : "");
      }}
      onBlur={() => {
        setFocus(false);
        onCommit(parseMoney(text));
      }}
      onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ""))}
    />
  );
}

export function Page({
  title,
  lede,
  actions,
  children,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-4xl leading-none tracking-tight">{title}</h1>
          {lede ? <p className="mt-2 max-w-xl text-sm text-muted">{lede}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-2xl border border-line bg-surface p-4", className)}>{children}</section>;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-10 text-center">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="size-6" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = "Cargando tus datos…" }: { label?: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-4 h-36 animate-pulse rounded-2xl bg-surface-2" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}

const statusClass: Record<ReservationStatus, string> = {
  confirmada: "bg-primary-soft text-primary",
  borrador: "bg-surface-2 text-muted",
  cancelada: "bg-danger-soft text-danger",
  finalizada: "bg-accent-soft text-fg",
};

export function StatusBadge({ status, label }: { status: ReservationStatus; label: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", statusClass[status])}>{label}</span>
  );
}

export function DemoBadge() {
  return <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold">Prueba</span>;
}

export function DocText({ value }: { value: string }) {
  const mask = useVm((s) => s.prefs.maskDocuments);
  const [show, setShow] = useState(false);
  const visible = !mask || show;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span>{visible ? formatDoc(value) : maskDoc(value)}</span>
      {mask ? (
        <button
          type="button"
          className="grid size-8 place-items-center rounded-lg text-muted"
          aria-label={visible ? "Ocultar identificación" : "Mostrar identificación"}
          onClick={() => setShow((v) => !v)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      ) : null}
    </span>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="vm-overlay fixed inset-0 z-40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-3xl leading-none">{title}</Dialog.Title>
            <Dialog.Close className="grid size-11 place-items-center rounded-xl text-muted" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ConfirmAsk = {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<
  (opts: { title: string; body: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>
>(async () => false);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<ConfirmAsk | null>(null);
  const settled = useRef(false);
  const confirm = (opts: { title: string; body: string; confirmLabel?: string; danger?: boolean }) => {
    settled.current = false;
    return new Promise<boolean>((resolve) => setAsk({ ...opts, resolve }));
  };
  const close = (value: boolean) => {
    if (settled.current) return;
    settled.current = true;
    setAsk((current) => {
      current?.resolve(value);
      return null;
    });
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={Boolean(ask)} onOpenChange={(open) => !open && close(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="vm-overlay fixed inset-0 z-50" />
          <AlertDialog.Content className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl border border-line bg-surface p-5 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2">
            <AlertDialog.Title className="font-display text-3xl leading-none">{ask?.title}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted">{ask?.body}</AlertDialog.Description>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">Volver</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant={ask?.danger ? "danger" : "primary"} onClick={() => close(true)}>
                  {ask?.confirmLabel ?? "Confirmar"}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}

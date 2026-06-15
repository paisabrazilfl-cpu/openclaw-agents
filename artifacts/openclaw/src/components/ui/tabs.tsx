import {
  createContext,
  useContext,
  useState,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// Minimal headless tabs. Triggers/content expose data-state="active|inactive"
// so the data-[state=active]:* Tailwind utilities in consumers light up.

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
}
const Ctx = createContext<TabsCtx | null>(null);

function useTabs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
}

export function Tabs({ defaultValue, value, onValueChange, className, children, ...props }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const setValue = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <Ctx.Provider value={{ value: current, setValue }}>
      <div className={className} {...props}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn("inline-flex items-center", className)} {...props} />;
}

interface TriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, ...props }: TriggerProps) {
  const { value: current, setValue } = useTabs();
  const active = current === value;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={() => setValue(value)}
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, ...props }: ContentProps) {
  const { value: current } = useTabs();
  if (current !== value) return null;
  return <div role="tabpanel" data-state="active" className={className} {...props} />;
}

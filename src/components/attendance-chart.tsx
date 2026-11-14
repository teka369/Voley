import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AttendanceChart({ data }: { data: { name: string; asistieron: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fill: "var(--vm-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} width={32} tick={{ fill: "var(--vm-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--vm-surface-2)" }}
            contentStyle={{
              background: "var(--vm-surface)",
              border: "1px solid var(--vm-line)",
              borderRadius: 12,
              color: "var(--vm-fg)",
            }}
          />
          <Bar dataKey="asistieron" name="Asistieron" fill="var(--vm-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { Metadata } from 'next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Leaderboard — Top Weight Loss Progress',
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface LeaderboardEntry {
  rank: number;
  username: string;
  weight_lost_kg: number;
  weeks_tracked: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total_opted_in: number;
}

async function fetchLeaderboard(): Promise<LeaderboardData> {
  const res = await fetch(`${apiBaseUrl}/api/v1/leaderboard`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return { entries: [], total_opted_in: 0 };
  return res.json();
}

export default async function LeaderboardPage() {
  const data = await fetchLeaderboard();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total_opted_in} members sharing their progress
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top weight loss progress</CardTitle>
          </CardHeader>
          <CardContent>
            {data.entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No entries yet — be the first to opt in from your settings!
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 text-right font-medium">Lost (kg)</th>
                    <th className="pb-2 text-right font-medium">Weeks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.rank} className="border-b last:border-0">
                      <td className="py-2 text-muted-foreground">{entry.rank}</td>
                      <td className="py-2 font-medium">{entry.username}</td>
                      <td className="py-2 text-right text-green-600">
                        -{entry.weight_lost_kg.toFixed(1)}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {entry.weeks_tracked}w
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Usernames are masked to protect privacy. Opt in from your profile settings.
        </p>
      </div>
    </main>
  );
}

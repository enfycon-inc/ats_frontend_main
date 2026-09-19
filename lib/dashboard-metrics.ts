type DashboardJob = { jobStatus?: string; createdOn?: string };

export function getDashboardJobMetrics<T extends DashboardJob>(jobs: T[], today = new Date()) {
  const statusMix = [0, 0, 0, 0];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    return date;
  });
  const dailyJobs = days.map(() => 0);
  const timestamp = (job: DashboardJob) => {
    const value = job.createdOn ? new Date(job.createdOn).getTime() : NaN;
    return Number.isFinite(value) ? value : 0;
  };

  for (const job of jobs) {
    const status = job.jobStatus?.trim().toLowerCase();
    if (status === "active") statusMix[0]++;
    else if (status === "hold" || status === "on hold") statusMix[1]++;
    else if (status === "closed" || status === "close") statusMix[2]++;
    else if (status === "filled") statusMix[3]++;

    const created = new Date(timestamp(job));
    created.setHours(0, 0, 0, 0);
    const index = days.findIndex(day => day.getTime() === created.getTime());
    if (index >= 0) dailyJobs[index]++;
  }

  return {
    statusMix,
    dailyJobs,
    dayLabels: days.map(day => day.toLocaleDateString("en-US", { month: "short", day: "numeric" })),
    recentJobs: [...jobs].sort((a, b) => timestamp(b) - timestamp(a)).slice(0, 5),
  };
}

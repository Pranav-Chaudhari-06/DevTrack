const Task = require('../models/Task');

/**
 * GET /api/projects/:id/analytics
 *
 * Returns all data needed for the Analytics page in one request.
 * We fetch all tasks for the project and do the aggregation in JS —
 * appropriate for typical project sizes and much simpler than multiple
 * MongoDB aggregation pipelines.
 */
const getAnalytics = async (req, res) => {
  try {
    const projectId = req.params.id;

    // Fetch everything we need in one query
    const allTasks = await Task.find({ project: projectId })
      .select('type status priority assignedTo createdAt resolvedAt')
      .lean();

    const now = new Date();

    // ── 1. Summary stats ────────────────────────────────────────────────────
    const totalTasks = allTasks.length;

    const openBugs = allTasks.filter(
      (t) => t.type === 'bug' && t.status !== 'resolved'
    ).length;

    // Start of the current week (Sunday midnight)
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const resolvedThisWeek = allTasks.filter(
      (t) => t.resolvedAt && new Date(t.resolvedAt) >= weekStart
    ).length;

    // Average resolution time (days) for tasks that have a resolvedAt stamp
    const resolvedWithTime = allTasks.filter((t) => t.resolvedAt && t.createdAt);
    const avgResolutionDays =
      resolvedWithTime.length > 0
        ? Math.round(
            (resolvedWithTime.reduce(
              (sum, t) =>
                sum +
                (new Date(t.resolvedAt) - new Date(t.createdAt)) /
                  (1000 * 60 * 60 * 24),
              0
            ) /
              resolvedWithTime.length) *
              10
          ) / 10
        : 0;

    // ── 2. Status distribution ───────────────────────────────────────────────
    const statusDist = [
      { name: 'Open',        value: allTasks.filter((t) => t.status === 'open').length },
      { name: 'In Progress', value: allTasks.filter((t) => t.status === 'in-progress').length },
      { name: 'Resolved',    value: allTasks.filter((t) => t.status === 'resolved').length },
    ];

    // ── 3. Type distribution ─────────────────────────────────────────────────
    const typeDist = [
      { name: 'Task', value: allTasks.filter((t) => t.type === 'task').length },
      { name: 'Bug',  value: allTasks.filter((t) => t.type === 'bug').length },
    ];

    // ── 4. Weekly created vs resolved — last 6 weeks ─────────────────────────
    const weeklyData = [];
    for (let i = 5; i >= 0; i--) {
      // Find the Sunday that starts each past week
      const anchor = new Date(now);
      anchor.setDate(anchor.getDate() - i * 7);
      const wStart = new Date(anchor);
      wStart.setDate(anchor.getDate() - anchor.getDay());
      wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 7);

      weeklyData.push({
        week: wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created: allTasks.filter(
          (t) => new Date(t.createdAt) >= wStart && new Date(t.createdAt) < wEnd
        ).length,
        resolved: allTasks.filter(
          (t) => t.resolvedAt && new Date(t.resolvedAt) >= wStart && new Date(t.resolvedAt) < wEnd
        ).length,
      });
    }

    // ── 5. Tasks per assignee (top 10) ───────────────────────────────────────
    const assigneeMap = {};
    allTasks.forEach((t) => {
      if (!t.assignedTo) return;
      // For emails like "alice@test.com" use the local part; for names use as-is
      const label = t.assignedTo.includes('@')
        ? t.assignedTo.split('@')[0]
        : t.assignedTo;
      assigneeMap[label] = (assigneeMap[label] || 0) + 1;
    });

    const assigneeDist = Object.entries(assigneeMap)
      .map(([name, tasks]) => ({ name, tasks }))
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 10);

    res.json({
      summary: { totalTasks, openBugs, resolvedThisWeek, avgResolutionDays },
      statusDist,
      typeDist,
      weeklyData,
      assigneeDist,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAnalytics };

const { getJob } = require('../queue');

// GET /api/jobs/:id
const getJobStatus = async (req, res) => {
  try {
    const job = await getJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.churchId && job.churchId !== req.churchId && !req.user?.is_super_admin) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    const { churchId: _churchId, ...safeJob } = job;
    return res.json({ success: true, data: safeJob });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getJobStatus };

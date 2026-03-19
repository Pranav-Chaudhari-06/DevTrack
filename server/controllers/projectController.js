const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');

// POST /api/projects
const createProject = async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  try {
    // Creator is automatically added as admin of the project
    const project = await Project.create({
      name,
      description,
      createdBy: req.user.id,
      members: [{ user: req.user.id, role: 'admin' }],
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/projects
const getProjects = async (req, res) => {
  try {
    // Find all projects where the user appears in the members array
    const projects = await Project.find({ 'members.user': req.user.id }).sort({
      createdAt: -1,
    });

    // Attach task count and the current user's role to each project
    const projectsWithMeta = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({ project: project._id });
        const member = project.members.find(
          (m) => m.user.toString() === req.user.id
        );
        return { ...project.toObject(), taskCount, myRole: member?.role };
      })
    );

    res.json(projectsWithMeta);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/projects/:id
// req.project and req.projectRole are already set by checkProjectRole middleware
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email role');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Include the current user's role in the response for the frontend
    const member = project.members.find(
      (m) => m.user._id.toString() === req.user.id
    );

    res.json({ ...project.toObject(), myRole: member?.role });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/projects/:id   [admin only]
const deleteProject = async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/projects/:id/members
const getMembers = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      'members.user',
      'name email role'
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project.members);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/projects/:id/members   [admin only]
// Body: { email, role }
const inviteMember = async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ message: 'email and role are required' });
  }
  if (!['admin', 'developer', 'viewer'].includes(role)) {
    return res.status(400).json({ message: 'role must be admin, developer, or viewer' });
  }

  try {
    const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToInvite) {
      return res.status(404).json({ message: `No user found with email: ${email}` });
    }

    const project = await Project.findById(req.params.id);
    const alreadyMember = project.members.some(
      (m) => m.user.toString() === userToInvite._id.toString()
    );

    if (alreadyMember) {
      return res.status(409).json({ message: 'User is already a member of this project' });
    }

    project.members.push({ user: userToInvite._id, role });
    await project.save();

    // Return the new member with populated user data
    const populated = await Project.findById(req.params.id).populate(
      'members.user',
      'name email role'
    );
    const newMember = populated.members.find(
      (m) => m.user._id.toString() === userToInvite._id.toString()
    );

    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PATCH /api/projects/:id/members/:userId   [admin only]
// Body: { role }
const updateMemberRole = async (req, res) => {
  const { role } = req.body;

  if (!role || !['admin', 'developer', 'viewer'].includes(role)) {
    return res.status(400).json({ message: 'role must be admin, developer, or viewer' });
  }

  try {
    const project = await Project.findById(req.params.id);
    const member = project.members.find(
      (m) => m.user.toString() === req.params.userId
    );

    if (!member) {
      return res.status(404).json({ message: 'Member not found in this project' });
    }

    // Prevent demoting yourself if you're the only admin
    if (
      req.params.userId === req.user.id &&
      role !== 'admin'
    ) {
      const adminCount = project.members.filter((m) => m.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'Cannot change your role — you are the only admin of this project',
        });
      }
    }

    member.role = role;
    await project.save();

    res.json({ userId: req.params.userId, role });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/projects/:id/members/:userId   [admin only]
const removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === req.params.userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in this project' });
    }

    // Prevent removing the last admin
    const targetMember = project.members[memberIndex];
    if (targetMember.role === 'admin') {
      const adminCount = project.members.filter((m) => m.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'Cannot remove the last admin of a project',
        });
      }
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  deleteProject,
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
};

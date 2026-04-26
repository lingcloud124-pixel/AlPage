import { Router } from 'express';
import { db, saveDb, getProjectCount, MAX_PROJECTS_PER_USER } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const stmt = db.prepare(
      'SELECT * FROM theme_projects WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC'
    );
    stmt.bind([userId]);
    const projects = [];
    while (stmt.step()) {
      projects.push(stmt.getAsObject());
    }
    stmt.free();
    
    const parsedProjects = projects.map(project => ({
      ...project,
      colors: JSON.parse(project.colors || '{}'),
      visual_context: project.visual_context ? JSON.parse(project.visual_context) : null
    }));
    
    res.json(parsedProjects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id, name, nameEn, templateType, colors, bgImageUrl, visualContext } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ error: 'id and name are required' });
    }

    const projectCount = getProjectCount(userId);
    if (projectCount >= MAX_PROJECTS_PER_USER) {
      return res.status(403).json({ error: `项目数量已达上限 (${MAX_PROJECTS_PER_USER} 个)`, code: 'PROJECT_LIMIT_EXCEEDED' });
    }
    
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO theme_projects (
        id, user_id, name, name_en, template_type, colors, bg_image_url, 
        header_bg_image_url, visual_context, pinned, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([
      id,
      userId,
      name,
      nameEn || null,
      templateType || 'light-ui',
      JSON.stringify(colors || {}),
      bgImageUrl || null,
      null,
      visualContext ? JSON.stringify(visualContext) : null,
      0,
      now,
      now
    ]);
    stmt.step();
    stmt.free();
    
    // Check if insertion was successful by querying back
    const checkStmt = db.prepare('SELECT id FROM theme_projects WHERE id = ? AND user_id = ?');
    checkStmt.bind([id, userId]);
    let exists = false;
    if (checkStmt.step()) {
      exists = true;
    }
    checkStmt.free();
    
    if (!exists) {
      return res.status(500).json({ error: 'Failed to create project' });
    }
    
    // Save to disk after write operation
    saveDb();
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const stmt = db.prepare(
      'SELECT * FROM theme_projects WHERE id = ? AND user_id = ?'
    );
    stmt.bind([id, userId]);
    let project = null;
    if (stmt.step()) {
      project = stmt.getAsObject();
    }
    stmt.free();
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const parsedProject = {
      ...project,
      colors: JSON.parse(project.colors || '{}'),
      visual_context: project.visual_context ? JSON.parse(project.visual_context) : null
    };
    
    res.json(parsedProject);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const updates = req.body;
    
    const existingStmt = db.prepare(
      'SELECT id FROM theme_projects WHERE id = ? AND user_id = ?'
    );
    existingStmt.bind([id, userId]);
    let existingProject = null;
    if (existingStmt.step()) {
      existingProject = existingStmt.getAsObject();
    }
    existingStmt.free();
    
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.nameEn !== undefined) {
      fields.push('name_en = ?');
      values.push(updates.nameEn);
    }
    if (updates.templateType !== undefined) {
      fields.push('template_type = ?');
      values.push(updates.templateType);
    }
    if (updates.colors !== undefined) {
      fields.push('colors = ?');
      values.push(JSON.stringify(updates.colors));
    }
    if (updates.bgImageUrl !== undefined) {
      fields.push('bg_image_url = ?');
      values.push(updates.bgImageUrl);
    }
    if (updates.headerBgImageUrl !== undefined) {
      fields.push('header_bg_image_url = ?');
      values.push(updates.headerBgImageUrl);
    }
    if (updates.visualContext !== undefined) {
      fields.push('visual_context = ?');
      values.push(updates.visualContext ? JSON.stringify(updates.visualContext) : null);
    }
    if (updates.pinned !== undefined) {
      fields.push('pinned = ?');
      values.push(updates.pinned ? 1 : 0);
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    
    const query = `UPDATE theme_projects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    const stmt = db.prepare(query);
    stmt.bind([...values, id, userId]);
    stmt.step();
    const changes = db.getRowsModified();
    stmt.free();
    
    if (changes === 0) {
      return res.status(404).json({ error: 'Project not found or no changes made' });
    }
    
    // Save to disk after write operation
    saveDb();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const stmt = db.prepare(
      'DELETE FROM theme_projects WHERE id = ? AND user_id = ?'
    );
    stmt.bind([id, userId]);
    stmt.step();
    const changes = db.getRowsModified();
    stmt.free();
    
    if (changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Save to disk after write operation
    saveDb();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as projectsRouter };
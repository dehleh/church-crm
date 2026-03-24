const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getMediaItems = async (req, res) => {
  const { page = 1, limit = 20, type, published, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = ['mi.church_id = $1'];
    let params = [req.churchId];
    let idx = 2;

    if (type) { conditions.push(`mi.media_type = $${idx++}`); params.push(type); }
    if (published !== undefined) { conditions.push(`mi.is_published = $${idx++}`); params.push(published === 'true'); }
    if (search) {
      conditions.push(`(mi.title ILIKE $${idx} OR mi.minister_name ILIKE $${idx} OR mi.series_name ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM media_items mi WHERE ${where}`, params);
    params.push(parseInt(limit), offset);

    const { rows } = await query(
      `SELECT mi.*, u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM media_items mi
       LEFT JOIN users u ON u.id = mi.created_by
       WHERE ${where}
       ORDER BY mi.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countRes.rows[0].count / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createMediaItem = async (req, res) => {
  const {
    title, description, mediaType, fileUrl, thumbnailUrl, durationSeconds,
    ministerName, seriesName, scriptureReference, eventId, tags, branchId
  } = req.body;

  try {
    const { rows } = await query(
      `INSERT INTO media_items (
        id, church_id, branch_id, title, description, media_type, file_url, thumbnail_url,
        duration_seconds, minister_name, series_name, scripture_reference,
        event_id, tags, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        uuidv4(), req.churchId, branchId || null, title, description || null,
        mediaType || null, fileUrl || null, thumbnailUrl || null,
        durationSeconds || null, ministerName || null, seriesName || null,
        scriptureReference || null, eventId || null,
        tags || [], req.user.id
      ]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const publishMediaItem = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `UPDATE media_items SET is_published = true, published_at = NOW()
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [id, req.churchId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Media item not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMediaStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_published = true) as published,
        COUNT(*) FILTER (WHERE media_type = 'sermon') as sermons,
        COUNT(*) FILTER (WHERE media_type = 'worship') as worship,
        SUM(view_count) as total_views,
        SUM(download_count) as total_downloads
       FROM media_items WHERE church_id = $1`,
      [req.churchId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const uploadMediaFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/media/${req.file.filename}`;
  return res.json({
    success: true,
    data: {
      fileUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
};

module.exports = { getMediaItems, createMediaItem, uploadMediaFile, publishMediaItem, getMediaStats };

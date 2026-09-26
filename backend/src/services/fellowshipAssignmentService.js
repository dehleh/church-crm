const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Calculates Haversine distance in kilometers between two geo points
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Automatically assigns a member to the nearest/most relevant Fellowship Cell or Cluster.
 */
async function autoAssignFellowshipCell({
  churchId,
  branchId,
  memberId,
  address,
  city,
  state,
  latitude,
  longitude,
}) {
  try {
    if (!churchId || !memberId) return { assigned: false, reason: 'Missing churchId or memberId' };

    // Fetch active centers for this church
    const { rows: centers } = await query(
      `SELECT fc.*, fz.name as zone_name, fz.target_areas,
              m.first_name as leader_first_name, m.last_name as leader_last_name, m.phone as leader_phone,
              (SELECT COUNT(*) FROM fellowship_members fm WHERE fm.center_id = fc.id AND fm.status = 'active') as current_members
       FROM fellowship_centers fc
       LEFT JOIN fellowship_zones fz ON fz.id = fc.zone_id
       LEFT JOIN members m ON m.id = fc.leader_member_id
       WHERE fc.church_id = $1 AND fc.status = 'active'`,
      [churchId]
    );

    if (!centers.length) {
      return { assigned: false, reason: 'No active fellowship centers found for this church' };
    }

    const memberLocationText = `${address || ''} ${city || ''} ${state || ''}`.toLowerCase();
    const memberTokens = memberLocationText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['street', 'road', 'close', 'avenue', 'str', 'cres', 'drive', 'near', 'beside', 'opposite'].includes(w));

    let bestCenter = null;
    let highestScore = -1;

    for (const center of centers) {
      let score = 0;

      // 1. GPS Proximity if coordinates are available
      const mLat = parseFloat(latitude);
      const mLon = parseFloat(longitude);
      const cLat = parseFloat(center.latitude);
      const cLon = parseFloat(center.longitude);

      if (!isNaN(mLat) && !isNaN(mLon) && !isNaN(cLat) && !isNaN(cLon)) {
        const distKm = haversineDistance(mLat, mLon, cLat, cLon);
        if (distKm <= 1.0) score += 60;
        else if (distKm <= 3.0) score += 45;
        else if (distKm <= 7.0) score += 30;
        else if (distKm <= 15.0) score += 15;
      }

      // 2. Zone Target Areas Match (e.g. ['Lekki Phase 1', 'Agungi', 'Osapa'])
      if (Array.isArray(center.target_areas) && center.target_areas.length) {
        for (const area of center.target_areas) {
          const areaLower = String(area).toLowerCase().trim();
          if (areaLower && memberLocationText.includes(areaLower)) {
            score += 35;
          }
        }
      }

      // 3. Landmark Match
      if (center.landmark) {
        const landmarkLower = center.landmark.toLowerCase();
        if (memberLocationText.includes(landmarkLower)) {
          score += 30;
        }
      }

      // 4. Center Address & Name Keywords
      const centerText = `${center.name || ''} ${center.host_address || ''} ${center.city || ''}`.toLowerCase();
      for (const token of memberTokens) {
        if (centerText.includes(token)) {
          score += 10;
        }
      }

      // 5. City & State alignment
      if (city && center.city && center.city.toLowerCase() === city.toLowerCase()) {
        score += 15;
      }
      if (state && center.state && center.state.toLowerCase() === state.toLowerCase()) {
        score += 5;
      }

      // 6. Branch alignment bonus
      if (branchId && center.branch_id === branchId) {
        score += 10;
      }

      // 7. Capacity consideration
      if (center.max_capacity && parseInt(center.current_members) >= parseInt(center.max_capacity)) {
        score -= 15;
      }

      if (score > highestScore) {
        highestScore = score;
        bestCenter = center;
      }
    }

    // If no strong match (> 10), assign to the center in the same branch/church with most capacity
    if (!bestCenter || highestScore <= 5) {
      bestCenter = centers.sort((a, b) => (parseInt(a.current_members) || 0) - (parseInt(b.current_members) || 0))[0];
    }

    if (bestCenter) {
      // Enroll member in the chosen cell
      await query(
        `INSERT INTO fellowship_members (id, church_id, center_id, member_id, role, status)
         VALUES ($1, $2, $3, $4, 'member', 'active')
         ON CONFLICT (center_id, member_id) DO NOTHING`,
        [uuidv4(), churchId, bestCenter.id, memberId]
      );

      // Update member's primary cell
      await query(
        `UPDATE members SET fellowship_cell_id = $1 WHERE id = $2`,
        [bestCenter.id, memberId]
      );

      logger.info('Auto-assigned member to fellowship cell', {
        memberId,
        centerId: bestCenter.id,
        centerName: bestCenter.name,
        score: highestScore,
      });

      return {
        assigned: true,
        score: highestScore,
        center: {
          id: bestCenter.id,
          name: bestCenter.name,
          code: bestCenter.code,
          hostAddress: bestCenter.host_address,
          landmark: bestCenter.landmark,
          city: bestCenter.city,
          meetingDay: bestCenter.meeting_day,
          meetingTime: bestCenter.meeting_time,
          leaderName: bestCenter.leader_first_name
            ? `${bestCenter.leader_first_name} ${bestCenter.leader_last_name || ''}`.trim()
            : null,
          leaderPhone: bestCenter.leader_phone || null,
        },
      };
    }

    return { assigned: false };
  } catch (err) {
    logger.error('Error in autoAssignFellowshipCell', { error: err.message, memberId });
    return { assigned: false, error: err.message };
  }
}

module.exports = {
  autoAssignFellowshipCell,
  haversineDistance,
};

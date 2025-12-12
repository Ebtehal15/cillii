const { db } = require('./db');

const DEFAULT_PREFIX = 'CR';

const getNextSpecialId = (prefix = DEFAULT_PREFIX) => new Promise((resolve, reject) => {
  const sanitizedPrefix = String(prefix).toUpperCase();
  const query = `
    SELECT special_id FROM classes
    WHERE special_id LIKE ?
    ORDER BY CAST(SUBSTR(special_id, LENGTH(?) + 1) AS INTEGER) DESC
    LIMIT 1;
  `;

  db.get(query, [`${sanitizedPrefix}%`, sanitizedPrefix], (err, row) => {
    if (err) {
      reject(err);
      return;
    }

    if (!row || !row.special_id) {
      resolve(`${sanitizedPrefix}01`);
      return;
    }

    const numericPart = row.special_id.slice(sanitizedPrefix.length);
    const currentNumber = parseInt(numericPart, 10);
    const width = numericPart.length > 0 ? numericPart.length : 2;
    const nextNumber = Number.isNaN(currentNumber) ? 1 : currentNumber + 1;
    const formattedNumber = String(nextNumber).padStart(width, '0');

    resolve(`${sanitizedPrefix}${formattedNumber}`);
  });
});

const parseClassPayload = (payload = {}, options = {}) => {
  const {
    mainCategory,
    quality,
    className,
    classNameArabic,
    classNameEnglish,
    classFeatures,
    classPrice,
    classWeight,
    classQuantity,
    specialId,
    classVideoUrl,
  } = payload;

  const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error('Invalid numeric value.');
    }
    return parsed;
  };

  const parseInteger = (value) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new Error('Invalid numeric value.');
    }
    return parsed;
  };

  const parsedPrice = parseNumber(classPrice);
  const parsedWeight = parseNumber(classWeight);
  const parsedQuantity = parseInteger(classQuantity);

  const trimmedSpecialId = specialId ? String(specialId).trim().toUpperCase() : undefined;
  let normalizedVideoUrl;
  if (classVideoUrl !== undefined) {
    const trimmedVideo = String(classVideoUrl).trim();
    normalizedVideoUrl = trimmedVideo.length ? trimmedVideo : null;
  }

  return {
    mainCategory: mainCategory !== undefined ? String(mainCategory).trim() : undefined,
    quality: quality !== undefined ? String(quality).trim() : undefined,
    className: className !== undefined ? String(className).trim() : undefined,
    classNameArabic: classNameArabic !== undefined && classNameArabic !== null
      ? String(classNameArabic).trim()
      : classNameArabic,
    classNameEnglish: classNameEnglish !== undefined && classNameEnglish !== null
      ? String(classNameEnglish).trim()
      : classNameEnglish,
    classFeatures: classFeatures !== undefined && classFeatures !== null
      ? String(classFeatures).trim()
      : classFeatures,
    classPrice: parsedPrice,
    classWeight: parsedWeight,
    classQuantity: parsedQuantity,
    specialId: trimmedSpecialId,
    classVideoUrl: normalizedVideoUrl,
    ...options,
  };
};

// Get current timestamp in Turkey timezone (Europe/Istanbul)
const getTurkeyTimestamp = () => {
  const now = new Date();
  // Convert to Turkey timezone (UTC+3)
  const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  // Format as SQLite datetime string (YYYY-MM-DD HH:MM:SS)
  const year = turkeyTime.getFullYear();
  const month = String(turkeyTime.getMonth() + 1).padStart(2, '0');
  const day = String(turkeyTime.getDate()).padStart(2, '0');
  const hours = String(turkeyTime.getHours()).padStart(2, '0');
  const minutes = String(turkeyTime.getMinutes()).padStart(2, '0');
  const seconds = String(turkeyTime.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

module.exports = {
  getNextSpecialId,
  parseClassPayload,
  getTurkeyTimestamp,
};

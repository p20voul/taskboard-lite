// απλα helpers για validation, χωρις joi/zod
// επιστρεφουν null αν ολα οκ, αλλιως string με το μηνυμα

const LIMITS = {
  title: 200,
  description: 2000,
  boardTitle: 100,
};

const STATUS = ['todo', 'progress', 'done'];
const PRIORITY = ['low', 'med', 'high'];
// πρεπει να ταιριαζει με τα tags του frontend (public/index.html, fTag select)
const TAG = ['feat', 'bug', 'ui', 'api'];

function checkLen(value, max, field) {
  if (value == null) return null;
  if (typeof value !== 'string') return `${field} πρεπει να ειναι string`;
  if (value.length > max) return `${field} max ${max} χαρακτηρες`;
  return null;
}

function checkEnum(value, allowed, field) {
  if (value == null) return null;
  if (!allowed.includes(value)) return `${field} πρεπει να ειναι ενα απο: ${allowed.join(', ')}`;
  return null;
}

// για POST/PUT task — title required, τα υπολοιπα οπτιοναλ
function validateTask(body) {
  const errs = [];
  const e1 = checkLen(body.title, LIMITS.title, 'title');               if (e1) errs.push(e1);
  const e2 = checkLen(body.description, LIMITS.description, 'description'); if (e2) errs.push(e2);
  const e3 = checkEnum(body.status, STATUS, 'status');                  if (e3) errs.push(e3);
  const e4 = checkEnum(body.priority, PRIORITY, 'priority');            if (e4) errs.push(e4);
  const e5 = checkEnum(body.tag, TAG, 'tag');                           if (e5) errs.push(e5);
  return errs.length ? errs.join(' · ') : null;
}

// για PATCH — μονο οσα πεδια εστειλε ο χρηστης
function validateTaskPatch(body) {
  // ιδιο logic, τα helpers ηδη γυρναν null για undefined
  return validateTask(body);
}

function validateBoard(body) {
  return checkLen(body.title, LIMITS.boardTitle, 'title');
}

module.exports = {
  validateTask,
  validateTaskPatch,
  validateBoard,
  LIMITS,
  STATUS,
  PRIORITY,
  TAG,
};

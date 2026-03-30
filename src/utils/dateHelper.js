const todayString = () => new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const daysBetween = (dateA, dateB) => {
  const msPerDay = 86400000;
  return Math.max(0, Math.floor((new Date(dateB) - new Date(dateA)) / msPerDay));
};

module.exports = { todayString, addDays, daysBetween };

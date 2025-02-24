const bcryptjs = require('bcryptjs');

const hashPassword = async (password) => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcryptjs.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword
}; 